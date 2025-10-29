import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Camera, Upload, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";
import axios from "axios";
import { PhotoUpload } from "@/components/officer/PhotoUpload";
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

const StartWork = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [locationVerified, setLocationVerified] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<any>(null);

  useEffect(() => {
    loadTask();
    getCurrentLocation();
  }, [id]);

  const loadTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await officerService.getTaskDetails(parseInt(id));
      setTask(data);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to load task",
        variant: "destructive"
      });
      navigate('/officer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationVerified(false);
        }
      );
    }
  };

  const handlePhotosChange = (photos: File[]) => {
    setBeforePhotos(photos);
  };


  const handleStartWorkClick = () => {
    if (beforePhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one before photo",
        variant: "destructive"
      });
      return;
    }

    if (!estimatedHours) {
      toast({
        title: "Missing Information",
        description: "Please provide estimated work duration",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleStartWork = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      // 1. Start work (update task status)
      await officerService.startWork(task.id, notes);

      // 2. Upload before photos
      const uploadPromises = beforePhotos.map(async (photo) => {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('upload_source', 'officer_before_photo');
        formData.append('caption', 'Before starting work');
        formData.append('is_proof_of_work', 'false');

        return axios.post(
          `${import.meta.env.VITE_API_URL}/media/upload/${task.id}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        );
      });

      await Promise.all(uploadPromises);

      toast({
        title: "Work Started",
        description: `Successfully uploaded ${beforePhotos.length} before photos. Good luck!`,
      });

      navigate(`/officer/task/${task.id}`);
    } catch (error: any) {
      console.error('Failed to start work:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to start work",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/officer/task/${task.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">Start Work</h1>
            <p className="text-xs text-muted-foreground">Task #{task.report_number}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="p-6 mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">{task.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{task.address}</p>

          <div className="space-y-6">
            {/* GPS Check-in */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">📍 GPS Check-in</h3>
              <Card className={`p-4 ${locationVerified ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Current Location:</p>
                      {currentLocation ? (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {currentLocation.lat.toFixed(6)}°N, {currentLocation.lng.toFixed(6)}°E
                          </p>
                          <p className="text-sm text-muted-foreground">Accuracy: ±{currentLocation.accuracy.toFixed(0)}m</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Getting location...</p>
                      )}
                    </div>
                  </div>
                  
                  {locationVerified && (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Location verified: You are at the site</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={getCurrentLocation}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Location
                  </Button>
                </div>
              </Card>
            </div>

            {/* Before Photos */}
            <div>
              <PhotoUpload
                maxPhotos={5}
                onPhotosChange={handlePhotosChange}
                title="Before Photos *"
                description="Take clear photos of the work area before starting"
                existingPhotos={beforePhotos}
              />
            </div>

            {/* Work Notes */}
            <div>
              <Label htmlFor="notes">Work Notes</Label>
              <Textarea
                id="notes"
                placeholder="Started work, clearing water logging. Will install drainage grill..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Estimated Time */}
            <div>
              <Label htmlFor="estimatedHours">Estimated Time (hours) *</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                placeholder="2.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="mt-2"
              />
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
              onClick={handleStartWorkClick}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Start Work
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Work on This Task?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to start work on this task. The work timer will begin and the citizen will be notified.
                Make sure you are at the location before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartWork}>
                Start Work
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default StartWork;
