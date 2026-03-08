import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Compass, SearchCheck, Bot, ArrowRight, Brain, Target, MessageSquare, Zap } from "lucide-react";
import { motion } from "framer-motion";

const aiTools = [
  {
    id: "career-advisor",
    title: "Career Path Advisor",
    description: "Get a personalized step-by-step career roadmap based on your stream, goals, and existing skills.",
    icon: Compass,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    link: "/career-advisor",
    features: ["Step-by-step roadmap", "Skill recommendations", "Pro tips & quick wins"],
    badge: "Most Popular",
  },
  {
    id: "skill-gap",
    title: "Skill Gap Analyzer",
    description: "Compare your current skills with industry requirements and get a prioritized improvement plan.",
    icon: SearchCheck,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    link: "/skill-gap",
    features: ["Industry comparison", "Priority ranking", "30-day action plan"],
    badge: null,
  },
  {
    id: "ai-mentor",
    title: "AI Mentor Chat",
    description: "Chat with your personal AI mentor for advice on learning, careers, interviews, and projects.",
    icon: Bot,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-500",
    link: "/ai-mentor",
    features: ["Conversational chat", "Personalized to you", "Instant responses"],
    badge: "New",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AIHub = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["ai-hub-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, stream, primary_goal, computed_level")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const firstName = profile?.display_name?.split(" ")[0] || "there";

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 p-6 md:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> AI-Powered
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Hey {firstName}! 👋
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Your personal AI toolkit for career success. Get personalized guidance, analyze your skills, and chat with an AI mentor — all trained to help you grow.
            </p>
            
            {profile?.stream && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.stream && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" /> {profile.stream}
                  </Badge>
                )}
                {profile.primary_goal && (
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" /> {profile.primary_goal}
                  </Badge>
                )}
                {profile.computed_level && (
                  <Badge variant="outline" className="text-xs">
                    Level: {profile.computed_level}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Tools Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 md:grid-cols-3"
        >
          {aiTools.map((tool) => (
            <motion.div key={tool.id} variants={cardVariants}>
              <Link to={tool.link} className="block h-full">
                <Card className="h-full group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  {tool.badge && (
                    <div className="absolute top-3 right-3">
                      <Badge className={`text-[10px] ${tool.badge === "New" ? "bg-green-500" : "bg-primary"}`}>
                        {tool.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className={`rounded-xl ${tool.bgColor} p-3 w-fit mb-3`}>
                      <tool.icon className={`h-6 w-6 ${tool.textColor}`} />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {tool.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5 mb-4">
                      {tool.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${tool.color}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Tips */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Pro Tip</h3>
                <p className="text-sm text-muted-foreground">
                  Start with the <strong>Career Path Advisor</strong> to get a complete roadmap, then use <strong>Skill Gap Analyzer</strong> to identify what to learn first. Chat with the <strong>AI Mentor</strong> whenever you have questions!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AIHub;
