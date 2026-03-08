import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, RotateCcw, Compass, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-advisor`;

const CareerAdvisor = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [existingSkills, setExistingSkills] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  // Pre-fill stream from profile
  const { data: profile } = useQuery({
    queryKey: ["career-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("stream")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Pre-fill user's completed skills
  const { data: userSkills } = useQuery({
    queryKey: ["career-user-skills", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_skill_progress")
        .select("skill_id, status, skills(name)")
        .eq("user_id", user!.id)
        .eq("status", "completed");
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.stream && !stream) setStream(profile.stream);
  }, [profile]);

  useEffect(() => {
    if (userSkills && userSkills.length > 0 && !existingSkills) {
      const skillNames = userSkills
        .map((s: any) => s.skills?.name)
        .filter(Boolean)
        .join(", ");
      if (skillNames) setExistingSkills(skillNames);
    }
  }, [userSkills]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isLoading && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, isLoading]);

  const handleSubmit = async () => {
    if (!stream.trim() || !careerGoal.trim()) {
      toast.error("Stream and career goal are required");
      return;
    }

    setIsLoading(true);
    setResponse("");
    setHasResult(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          stream: stream.trim(),
          careerGoal: careerGoal.trim(),
          existingSkills: existingSkills.trim(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResponse(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get career advice");
      if (!response) setHasResult(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResponse("");
    setHasResult(false);
    setCareerGoal("");
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Compass className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Career Advisor</h1>
            <p className="text-sm text-muted-foreground">Get a personalized career roadmap powered by AI</p>
          </div>
        </div>

        {!hasResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Tell us about yourself
              </CardTitle>
              <CardDescription>We'll create a personalized step-by-step career roadmap for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Your Stream / Branch *</Label>
                <Input
                  placeholder="e.g., Computer Science, Mechanical Engineering, Commerce..."
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">Your educational background or current field</p>
              </div>

              <div>
                <Label>Career Goal *</Label>
                <Input
                  placeholder="e.g., Full Stack Developer, Data Scientist, Product Manager..."
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">What role or career do you want to achieve?</p>
              </div>

              <div>
                <Label>Existing Skills</Label>
                <Textarea
                  placeholder="e.g., HTML, CSS, basic Python, Excel..."
                  value={existingSkills}
                  onChange={(e) => setExistingSkills(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">Skills you already have (auto-filled from your progress)</p>
              </div>

              {existingSkills && (
                <div className="flex flex-wrap gap-1.5">
                  {existingSkills.split(",").map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill.trim()}</Badge>
                  ))}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={isLoading || !stream.trim() || !careerGoal.trim()} className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Career Roadmap
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Input summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">{stream}</Badge>
                    <Badge>{careerGoal}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> New Query
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Response */}
            <Card>
              <CardContent className="p-6">
                <div
                  ref={responseRef}
                  className="prose prose-sm dark:prose-invert max-w-none max-h-[70vh] overflow-y-auto"
                >
                  {response ? (
                    <ReactMarkdown>{response}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      <span>Analyzing your profile and generating roadmap...</span>
                    </div>
                  )}
                </div>
                {isLoading && response && (
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <div className="animate-pulse h-2 w-2 rounded-full bg-primary" />
                    Generating...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CareerAdvisor;
