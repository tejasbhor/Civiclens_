import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { format } from "date-fns";

const AcknowledgeTask = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [completionDate, setCompletionDate] = useState<Date>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const task = {
    id: reportId || "CL-2025-RNC-00016",
    title: "Water logging on the road",
  };


  const handleAcknowledgeClick = () => {
    if (!completionDate) {
      toast({
        title: "Missing Information",
        description: "Please select expected completion date",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleAcknowledge = () => {
    setShowConfirmDialog(false);
    toast({
      title: "Task Acknowledged",
      description: "Citizen has been notified",
    });
    navigate(`/officer/task/${task.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/officer/task/${task.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">Acknowledge Task</h1>
            <p className="text-xs text-muted-foreground">Task #{task.id}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">{task.title}</h2>
            <p className="text-sm text-muted-foreground">
              Acknowledge this task and provide an estimated completion date
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="notes">Add your notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Will visit site today afternoon..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Let the citizen know your initial plan
              </p>
            </div>

            <div>
              <Label>Expected Completion Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completionDate ? format(completionDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={completionDate}
                    onSelect={setCompletionDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                When do you expect to complete this task?
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/officer/task/${task.id}`)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleAcknowledgeClick}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Acknowledge Task
            </Button>
          </div>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Acknowledge Task?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to acknowledge this task with an expected completion date of{" "}
                <strong>{completionDate ? format(completionDate, "PPP") : ""}</strong>.
                The citizen will be notified of your commitment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAcknowledge}>
                Confirm Acknowledgment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AcknowledgeTask;
