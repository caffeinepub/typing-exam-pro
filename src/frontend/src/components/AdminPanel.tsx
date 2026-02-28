import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart2,
  BookOpen,
  FileText,
  Keyboard,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Passage } from "../backend.d.ts";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import {
  useAddPassage,
  useDeletePassage,
  usePassages,
  useSeedData,
  useTestResults,
  useUpdatePassage,
} from "../hooks/useQueries";

interface PassageFormData {
  title: string;
  content: string;
  timeMinutes: string;
}

const emptyForm: PassageFormData = { title: "", content: "", timeMinutes: "5" };

export function AdminPanel() {
  const { logout, session } = useAuth();
  const { actor } = useActor();
  const { data: passages = [], isLoading: passagesLoading } = usePassages();
  const { data: testResults = [], isLoading: resultsLoading } =
    useTestResults();
  const seedData = useSeedData();
  const addPassage = useAddPassage();
  const updatePassage = useUpdatePassage();
  const deletePassage = useDeletePassage();

  // Seed on first admin load if no passages
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && !passagesLoading && passages.length === 0) {
      setSeeded(true);
      seedData.mutate(undefined, {
        onSuccess: () => toast.success("Sample passages loaded!"),
        onError: () => {},
      });
    }
  }, [seeded, passagesLoading, passages.length, seedData]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [formData, setFormData] = useState<PassageFormData>(emptyForm);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Passage | null>(null);

  function openAddDialog() {
    setEditingPassage(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(p: Passage) {
    setEditingPassage(p);
    setFormData({
      title: p.title,
      content: p.content,
      timeMinutes: String(p.timeMinutes),
    });
    setDialogOpen(true);
  }

  async function handleSavePassage() {
    const minutes = Number.parseInt(formData.timeMinutes, 10);
    if (
      !formData.title.trim() ||
      !formData.content.trim() ||
      Number.isNaN(minutes) ||
      minutes < 1
    ) {
      toast.error("Please fill all fields correctly.");
      return;
    }

    try {
      if (editingPassage) {
        await updatePassage.mutateAsync({
          id: editingPassage.id,
          title: formData.title.trim(),
          content: formData.content.trim(),
          timeMinutes: BigInt(minutes),
        });
        toast.success("Passage updated.");
      } else {
        await addPassage.mutateAsync({
          title: formData.title.trim(),
          content: formData.content.trim(),
          timeMinutes: BigInt(minutes),
        });
        toast.success("Passage added.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Failed to save passage.");
      console.error(err);
    }
  }

  async function handleDeletePassage() {
    if (!deleteTarget) return;
    try {
      await deletePassage.mutateAsync(deleteTarget.id);
      toast.success("Passage deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Failed to delete passage.");
      console.error(err);
    }
  }

  async function handleLogout() {
    if (actor && session) {
      try {
        await actor.logout(session.mobile);
      } catch {
        // ignore
      }
    }
    logout();
  }

  function formatDate(ts: bigint) {
    try {
      // Timestamp is in nanoseconds (ICP standard)
      const ms = Number(ts) / 1_000_000;
      return new Date(ms).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  const isSaving = addPassage.isPending || updatePassage.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-foreground">
            Typing Exam Pro
          </h1>
        </div>
        <Badge variant="secondary" className="ml-1 text-xs">
          Admin
        </Badge>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden sm:block">
          {session?.name}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </Button>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Tabs defaultValue="passages">
            <TabsList className="mb-6">
              <TabsTrigger value="passages" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Passages
                {passages.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {passages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <BarChart2 className="w-4 h-4" />
                Test Results
                {testResults.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {testResults.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* PASSAGES TAB */}
            <TabsContent value="passages">
              <div className="bg-card border border-border rounded-xl shadow-exam overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-foreground text-sm">
                      Manage Passages
                    </h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={openAddDialog}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Passage
                  </Button>
                </div>

                {passagesLoading ? (
                  <div className="p-5 space-y-3">
                    {["sk-1", "sk-2", "sk-3"].map((k) => (
                      <Skeleton key={k} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : passages.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">
                      No passages yet. Add one to get started.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 text-xs">#</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Duration</TableHead>
                          <TableHead className="text-xs">Words</TableHead>
                          <TableHead className="text-xs text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {passages.map((p, i) => (
                          <TableRow key={p.id} className="group">
                            <TableCell className="text-xs text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {p.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {String(p.timeMinutes)} min
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.content.trim().split(/\s+/).length} words
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(p)}
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(p)}
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TEST RESULTS TAB */}
            <TabsContent value="results">
              <div className="bg-card border border-border rounded-xl shadow-exam overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-foreground text-sm">
                      Student Results
                    </h2>
                  </div>
                  {testResults.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {testResults.length} exam
                      {testResults.length !== 1 ? "s" : ""} taken
                    </span>
                  )}
                </div>

                {resultsLoading ? (
                  <div className="p-5 space-y-3">
                    {["rsk-1", "rsk-2", "rsk-3", "rsk-4"].map((k) => (
                      <Skeleton key={k} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No exam results yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Mobile</TableHead>
                          <TableHead className="text-xs">Passage</TableHead>
                          <TableHead className="text-xs text-center">
                            WPM
                          </TableHead>
                          <TableHead className="text-xs text-center">
                            Accuracy
                          </TableHead>
                          <TableHead className="text-xs text-center">
                            Mistakes
                          </TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...testResults]
                          .sort(
                            (a, b) => Number(b.timestamp) - Number(a.timestamp),
                          )
                          .map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium text-sm">
                                {r.userName}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono-exam">
                                {r.userMobile}
                              </TableCell>
                              <TableCell
                                className="text-sm max-w-[160px] truncate"
                                title={r.passageTitle}
                              >
                                {r.passageTitle}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-primary font-bold text-sm">
                                  {String(r.wpm)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    Number(r.accuracy) >= 90
                                      ? "text-success bg-success/10"
                                      : Number(r.accuracy) >= 70
                                        ? "text-warning bg-warning/10"
                                        : "text-destructive bg-destructive/10"
                                  }`}
                                >
                                  {String(r.accuracy)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`text-sm font-medium ${
                                    Number(r.mistakes) === 0
                                      ? "text-success"
                                      : "text-destructive"
                                  }`}
                                >
                                  {String(r.mistakes)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(r.timestamp)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Add/Edit Passage Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingPassage ? "Edit Passage" : "Add New Passage"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="p-title">Title</Label>
              <Input
                id="p-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. The Industrial Revolution"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-time">Time Allowed (minutes)</Label>
              <Input
                id="p-time"
                type="number"
                min="1"
                max="60"
                value={formData.timeMinutes}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, timeMinutes: e.target.value }))
                }
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-content">
                Passage Content
                <span className="ml-2 text-xs text-muted-foreground">
                  (
                  {formData.content.trim()
                    ? formData.content.trim().split(/\s+/).length
                    : 0}{" "}
                  words)
                </span>
              </Label>
              <Textarea
                id="p-content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Type or paste the passage content here..."
                rows={8}
                className="font-mono-exam text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePassage} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSaving
                ? "Saving..."
                : editingPassage
                  ? "Update"
                  : "Add Passage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Passage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePassage}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletePassage.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-6">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
