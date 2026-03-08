
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'friend_request', 'message', 'badge', 'level_up'
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark read) own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (service role or via triggers)
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      'New Friend Request',
      'Someone sent you a friend request!',
      jsonb_build_object('requester_id', NEW.requester_id, 'friendship_id', NEW.id)
    );
  END IF;
  
  -- Notify requester when accepted
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.requester_id,
      'friend_request',
      'Friend Request Accepted',
      'Your friend request was accepted!',
      jsonb_build_object('addressee_id', NEW.addressee_id, 'friendship_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friendship_change
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- Function to create notification for new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.to_user_id,
    'message',
    'New Message',
    LEFT(NEW.body, 100),
    jsonb_build_object('from_user_id', NEW.from_user_id, 'message_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.peer_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Function to create notification for badge earned
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.user_id,
    'badge',
    'Badge Earned! 🏆',
    'You earned a new badge: ' || NEW.badge_key,
    jsonb_build_object('badge_key', NEW.badge_key)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_badge_earned();
