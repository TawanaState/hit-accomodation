"use client";

import { useEffect, useState } from "react";
import { useSessionContext } from "@/providers/SessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";
import { ISession } from "@/models/Session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, CalendarDays, CheckCircle2, Circle, AlertCircle, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function SessionsManagementPage() {
  const { sessions, refreshSessions, loading, activeSession } = useSessionContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isOpenForApplications, setIsOpenForApplications] = useState(false);

  const resetForm = () => {
    setName("");
    setCode("");
    setStartDate("");
    setEndDate("");
    setIsActive(false);
    setIsOpenForApplications(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          startDate,
          endDate,
          isActive,
          isOpenForApplications,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create session");
      }

      toast.success("Session created successfully");
      setIsDialogOpen(false);
      resetForm();
      await refreshSessions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSession = async (id: string, updates: Partial<ISession>) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update session");

      toast.success("Session updated");
      await refreshSessions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone and may break references in other data.")) {
        return;
    }

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete session");

      toast.success("Session deleted");
      await refreshSessions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Academic Sessions</h1>
          <p className="text-slate-500">Manage academic years and their active status.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name (e.g., Academic Year 2024/2025)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Session Code (e.g., 24-25)</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(checked as boolean)} />
                <Label htmlFor="isActive">Set as Active Session (Deactivates others)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isOpen" checked={isOpenForApplications} onCheckedChange={(checked) => setIsOpenForApplications(checked as boolean)} />
                <Label htmlFor="isOpen">Open for Applications</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Session"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session: any) => (
          <Card key={session._id} className={`border-l-4 ${session.isActive ? 'border-l-green-500 shadow-md' : 'border-l-slate-300'}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">{session.name}</CardTitle>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{session.code}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center text-sm text-slate-500 mt-2">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <Button
                      variant={session.isActive ? "secondary" : "outline"}
                      size="sm"
                      className={session.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}
                      onClick={() => handleUpdateSession(session._id, { isActive: true })}
                      disabled={session.isActive}
                    >
                      {session.isActive ? (
                        <><CheckCircle2 className="w-4 h-4 mr-1" /> Active</>
                      ) : (
                        <><Circle className="w-4 h-4 mr-1" /> Set Active</>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Applications</span>
                    <Button
                      variant={session.isOpenForApplications ? "secondary" : "outline"}
                      size="sm"
                      className={session.isOpenForApplications ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""}
                      onClick={() => handleUpdateSession(session._id, { isOpenForApplications: !session.isOpenForApplications })}
                    >
                       {session.isOpenForApplications ? 'Close' : 'Open'}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteSession(session._id)}
                    >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sessions.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No sessions found</h3>
                <p className="text-slate-500 mt-1 mb-4">Create your first academic session to get started.</p>
                <Button onClick={() => setIsDialogOpen(true)}>Create Session</Button>
            </div>
        )}
      </div>
    </div>
  );
}
