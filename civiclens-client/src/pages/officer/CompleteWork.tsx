import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Upload, CheckCircle2, ArrowLeftRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
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

const CompleteWork = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [task, setTask] = useState<any>(null);
  const [beforePhotos, setBeforePhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [completionNotes, setCompletionNotes] = useState("");
  const [workDuration, setWorkDuration] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [checklist, setChecklist] = useState({
    resolved: false,
    cleaned: false,
    photos: false,
    materials: false
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadTaskAndPhotos();
    }
  }, [id]);

  const loadTaskAndPhotos = async () => {
    try {
      setLoading(true);
      
      // Load task details
      const taskResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/reports/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      setTask(taskResponse.data);

      // Load media
      const mediaResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/media/report/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      
      // Filter before photos - API returns array directly, not wrapped in 'media'
      const mediaList = Array.isArray(mediaResponse.data) ? mediaResponse.data : [];
      const before = mediaList.filter(
        (m: any) => m.upload_source === 'officer_before_photo'
      );
      setBeforePhotos(before);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to load task details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalOfficerPhotos = beforePhotos.length + afterPhotos.length + files.length;
    
    // Backend limit is 5 officer photos (before + after combined)
    // Citizen photos are counted separately
    if (totalOfficerPhotos > 5) {
      const remaining = 5 - beforePhotos.length - afterPhotos.length;
      toast({
        title: "Photo Limit Reached",
        description: `Maximum 5 officer photos allowed (before + after combined). You have ${beforePhotos.length} before photos. You can add ${remaining} more after photos.`,
        variant: "destructive"
      });
      return;
    }
    
    setAfterPhotos([...afterPhotos, ...files]);
    setChecklist(prev => ({ ...prev, photos: true }));
  };


  const handleCompleteClick = () => {
    if (afterPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one after photo",
        variant: "destructive"
      });
      return;
    }

    if (!workDuration) {
      toast({
        title: "Missing Information",
        description: "Please provide actual work duration",
        variant: "destructive"
      });
      return;
    }

    if (!checklist.resolved) {
      toast({
        title: "Incomplete Checklist",
        description: "Please confirm that the issue is completely resolved",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleComplete = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      // 1. Upload after photos
      const uploadPromises = afterPhotos.map(async (photo) => {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('upload_source', 'officer_after_photo');
        formData.append('is_proof_of_work', 'true');
        formData.append('caption', 'After completing work');

        return axios.post(
          `${import.meta.env.VITE_API_URL}/media/upload/${id}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        );
      });

      // Use allSettled to allow partial success
      const results = await Promise.allSettled(uploadPromises);
      
      // Count successful uploads
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      // If all failed, throw error
      if (successCount === 0 && failedCount > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        throw firstError.reason;
      }
      
      // Log partial failures but continue
      if (failedCount > 0) {
        console.warn(`${failedCount} photo(s) failed to upload, but ${successCount} succeeded`);
      }

      // 2. Submit for verification
      const submitFormData = new FormData();
      const notes = `${completionNotes}\n\nWork Duration: ${workDuration} hours\nMaterials Used: ${materialsUsed || 'N/A'}`;
      submitFormData.append('resolution_notes', notes);

      await axios.post(
        `${import.meta.env.VITE_API_URL}/reports/${id}/submit-for-verification`,
        submitFormData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );

      toast({
        title: "Work Completed",
        description: successCount > 0 
          ? `Successfully uploaded ${successCount} after photo(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''} and submitted for verification.`
          : "Submitted for verification.",
      });

      navigate(`/officer/task/${id}`);
    } catch (error: any) {
      console.error('Failed to complete work:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error detail:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to submit work";
      console.error('Showing error to user:', errorMsg);
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted pb-8">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/officer/task/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">Complete Work</h1>
            <p className="text-xs text-muted-foreground">Task #{task.report_number}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">{task.title}</h2>

          <div className="space-y-6">
            {/* After Photos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>After Photos *</Label>
                <span className="text-xs text-muted-foreground">
                  {beforePhotos.length + afterPhotos.length}/5 officer photos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Take photos of completed work (max {5 - beforePhotos.length} more after photos)
              </p>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <label>
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <label>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </Button>
                </div>

                {afterPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {afterPhotos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={URL.createObjectURL(photo)} 
                          alt={`After ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Before/After Comparison */}
            {afterPhotos.length > 0 && beforePhotos.length > 0 && (
              <div>
                <Label>Before/After Comparison</Label>
                <div className="mt-2 space-y-2">
                  {beforePhotos.slice(0, Math.min(beforePhotos.length, afterPhotos.length)).map((beforePhoto, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Before</p>
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={`${import.meta.env.VITE_API_URL}${beforePhoto.file_url}`} 
                              alt={`Before ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">After</p>
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={afterPhotos[idx] ? URL.createObjectURL(afterPhotos[idx]) : ''} 
                              alt={`After ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center mt-2">
                        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Notes */}
            <div>
              <Label htmlFor="completionNotes">Work Completion Notes *</Label>
              <Textarea
                id="completionNotes"
                placeholder="Water logging cleared completely. Installed new drainage grill. Area cleaned and restored..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Work Duration */}
            <div>
              <Label htmlFor="workDuration">Actual Work Duration (hours) *</Label>
              <Input
                id="workDuration"
                type="number"
                step="0.5"
                placeholder="2.5"
                value={workDuration}
                onChange={(e) => setWorkDuration(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Materials Used */}
            <div>
              <Label htmlFor="materialsUsed">Materials Used (Optional)</Label>
              <Input
                id="materialsUsed"
                placeholder="Gravel, cement, drainage grill..."
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Checklist */}
            <div>
              <Label>Checklist</Label>
              <div className="mt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="resolved"
                    checked={checklist.resolved}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, resolved: checked as boolean }))
                    }
                  />
                  <label
                    htmlFor="resolved"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Issue completely resolved
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="cleaned"
                    checked={checklist.cleaned}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, cleaned: checked as boolean }))
                    }
                  />
                  <label
                    htmlFor="cleaned"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Area cleaned
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="photos"
                    checked={checklist.photos}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, photos: checked as boolean }))
                    }
                  />
                  <label
                    htmlFor="photos"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Before/After photos uploaded
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="materials"
                    checked={checklist.materials}
                    onCheckedChange={(checked) => 
                      setChecklist(prev => ({ ...prev, materials: checked as boolean }))
                    }
                  />
                  <label
                    htmlFor="materials"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All materials properly disposed
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/officer/task/${id}`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleCompleteClick}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Work for Verification?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to mark this task as completed and submit it for verification.
                Please ensure all work is done and photos have been uploaded. The citizen and admin will be notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Review Again</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete}>
                Submit for Verification
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default CompleteWork;
