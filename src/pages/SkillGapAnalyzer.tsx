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
import { SearchCheck, RotateCcw, Target, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const ANALYZER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skill-gap-analyzer`;

const SkillGapAnalyzer = () => {
  const { user } = useAuth();
  const [stream, setStream] = useState("");
  const [careerPath, setCareerPath] = useState("");
  const [existingSkills, setExistingSkills] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["gap-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("stream, primary_goal")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: userSkills } = useQuery({
    queryKey: ["gap-user-skills", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_skill_progress")
        .select("skill_id, status, skills(name)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.stream && !stream) setStream(profile.stream);
    if (profile?.primary_goal && !careerPath) setCareerPath(profile.primary_goal);
  }, [profile]);

  useEffect(() => {
    if (userSkills && userSkills.length > 0 && !existingSkills) {
      const completed = userSkills.filter((s: any) => s.status === "completed");
      const inProgress = userSkills.filter((s: any) => s.status === "in_progress");
      const parts: string[] = [];
      if (completed.length) {
        parts.push(completed.map((s: any) => s.skills?.name).filter(Boolean).join(", "));
      }
      if (inProgress.length) {
        parts.push(inProgress.map((s: any) => `${s.skills?.name} (learning)`).filter(Boolean).join(", "));
      }
      if (parts.join(", ")) setExistingSkills(parts.join(", "));
    }
  }, [userSkills]);

  useEffect(() => {
    if (isLoading && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, isLoading]);

  const handleSubmit = async () => {
    if (!careerPath.trim()) {
      toast.error("Career path is required");
      return;
    }

    setIsLoading(true);
    setResponse("");
    setHasResult(true);

    try {
      const resp = await fetch(ANALYZER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          stream: stream.trim(),
          careerPath: careerPath.trim(),
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
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setResponse(fullText); }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

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
            if (content) { fullText += content; setResponse(fullText); }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze skill gap");
      if (!response) setHasResult(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResponse("");
    setHasResult(false);
  };

  const skillCount = existingSkills ? existingSkills.split(",").length : 0;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-destructive/10 p-2.5">
            <SearchCheck className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Skill Gap Analyzer</h1>
            <p className="text-sm text-muted-foreground">Compare your skills with industry requirements</p>
          </div>
        </div>

        {!hasResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" /> Your Career Target
              </CardTitle>
              <CardDescription>We'll analyze the gap between your current skills and what the industry needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Your Stream / Background</Label>
                <Input
                  placeholder="e.g., Computer Science, Commerce, Mechanical..."
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <Label>Target Career Path *</Label>
                <Input
                  placeholder="e.g., Full Stack Developer, Data Scientist, DevOps Engineer..."
                  value={careerPath}
                  onChange={(e) => setCareerPath(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">The role you're aiming for</p>
              </div>

              <div>
                <Label>Your Current Skills</Label>
                <Textarea
                  placeholder="e.g., HTML, CSS, basic Python, SQL..."
                  value={existingSkills}
                  onChange={(e) => setExistingSkills(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-filled from your progress ({skillCount} skills detected)
                </p>
              </div>

              {existingSkills && (
                <div className="flex flex-wrap gap-1.5">
                  {existingSkills.split(",").map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill.trim()}</Badge>
                  ))}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={isLoading || !careerPath.trim()} className="w-full" size="lg">
                <SearchCheck className="h-4 w-4 mr-2" />
                Analyze Skill Gap
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 text-sm">
                    {stream && <Badge variant="outline">{stream}</Badge>}
                    <Badge>{careerPath}</Badge>
                    <Badge variant="secondary">{skillCount} current skills</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> New Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div ref={responseRef} className="prose prose-sm dark:prose-invert max-w-none max-h-[70vh] overflow-y-auto">
                  {response ? (
                    <ReactMarkdown>{response}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      <span>Analyzing your skill gaps against industry requirements...</span>
                    </div>
                  )}
                </div>
                {isLoading && response && (
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                    <div className="animate-pulse h-2 w-2 rounded-full bg-primary" />
                    Analyzing...
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

export default SkillGapAnalyzer;
