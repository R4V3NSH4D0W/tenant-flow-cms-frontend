"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@/lib/shared/react-query";
import { projectsApi } from "@/lib/projects/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Server, ShieldAlert, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmtpInitial {
  email: string;
  host: string;
  port: string;
  hasPassword: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
}

// ─── Inner form: state initialized once from props — no useEffect needed ──────

function SmtpSettingsForm({
  initial,
  projectSlug,
  canManage,
}: {
  initial: SmtpInitial;
  projectSlug: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();

  const [email, setEmail] = useState(initial.email);
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const updateSmtp = useMutation({
    mutationFn: (newPassword?: string) =>
      projectsApi.updateSmtp(projectSlug, {
        smtpEmail: email || null,
        smtpHost: host || null,
        smtpPort: port ? Number(port) : null,
        ...(newPassword !== undefined ? { smtpPassword: newPassword } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-smtp", projectSlug] });
      toast.success("SMTP configuration saved successfully");
      setPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save SMTP configuration");
    },
  });

  const testSmtp = useMutation({
    mutationFn: () =>
      projectsApi.testSmtp(projectSlug, {
        smtpEmail: email || null,
        smtpHost: host || null,
        smtpPort: port ? Number(port) : null,
        smtpPassword: password || undefined,
      }),
    onSuccess: (res) => {
      setTestResult({ success: true, message: res.message || "SMTP connection verified successfully" });
      toast.success("SMTP Connection Verified!");
    },
    onError: (err: Error) => {
      setTestResult({ success: false, message: err.message || "SMTP Connection Failed" });
      toast.error("SMTP Connection Failed");
    },
  });

  const handleSave = () => {
    if (!canManage) return;
    updateSmtp.mutate(password || undefined);
  };

  const handleTest = () => {
    setTestResult(null);
    testSmtp.mutate();
  };

  const isConfigured = !!initial.email && initial.hasPassword;

  return (
    <Card className="border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4 text-primary" />
          <span className="text-xs uppercase tracking-wider font-semibold">SMTP Integration</span>
        </div>
        <CardTitle className="text-lg">Mail Service Settings</CardTitle>
        <CardDescription>
          Configure outgoing SMTP server settings for dynamic forms notification emails and visitor confirmations.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* SMTP Server Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Server className="size-3.5 text-primary" /> SMTP Host
              </label>
              <Input
                placeholder="smtp.gmail.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={!canManage}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                SMTP Port
              </label>
              <Input
                placeholder="587"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={!canManage}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                Typically 587 (TLS/STARTTLS) or 465 (SSL).
              </p>
            </div>
          </div>

          {/* SMTP Credentials */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                SMTP Email (Sender)
              </label>
              <Input
                placeholder="user@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canManage}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                This account will receive submission notifications and act as the reply-to/sender address.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">
                SMTP Password / App Password
              </label>
              <div className="relative">
                <Input
                  placeholder={initial.hasPassword ? "•••••••• (Saved)" : "Enter password"}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!canManage}
                  className="h-10 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Gmail accounts require an <strong>App Password</strong> instead of your account password.
              </p>
            </div>
          </div>
        </div>

        {/* Connection Test Output Card */}
        {testResult && (
          <div
            className={`flex items-start gap-3 rounded-lg p-4 border text-sm ${
              testResult.success
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300"
                : "bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-300"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-rose-500 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? "Connection Verified!" : "Verification Failed"}</p>
              <p className="text-xs mt-0.5 break-all opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-4 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isConfigured ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>SMTP setup complete. Dynamic mail delivery active.</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5 text-amber-500" />
                <span>Mail integrations are currently inactive.</span>
              </>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testSmtp.isPending || !email || (!password && !initial.hasPassword)}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {testSmtp.isPending ? "Verifying..." : "Test Connection"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSmtp.isPending || !canManage}
              className="h-10 px-6 w-full sm:w-auto font-medium"
            >
              {updateSmtp.isPending ? "Saving..." : "Save SMTP Settings"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Outer shell: fetches data, then mounts inner form once ready ─────────────

export function ProjectSmtpSettingsCard({
  projectSlug,
  canManage,
}: {
  projectSlug: string;
  canManage: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["project-smtp", projectSlug],
    queryFn: () => projectsApi.getSmtp(projectSlug),
    enabled: !!projectSlug,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading SMTP configuration...
        </CardContent>
      </Card>
    );
  }

  // Derive initial values from fetched data — passed as props, never synced via useEffect.
  const initial: SmtpInitial = {
    email: data?.smtp?.smtpEmail ?? "",
    host: data?.smtp?.smtpHost ?? "smtp.gmail.com",
    port: String(data?.smtp?.smtpPort ?? 587),
    hasPassword: !!data?.smtp?.hasPassword,
  };

  // key={projectSlug} ensures a full remount if the user switches projects.
  return (
    <SmtpSettingsForm
      key={projectSlug}
      initial={initial}
      projectSlug={projectSlug}
      canManage={canManage}
    />
  );
}
