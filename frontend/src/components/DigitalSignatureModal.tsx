import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  action: string;
  isLoading?: boolean;
  error?: string | null;
}

export function DigitalSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  isLoading = false,
  error = null,
}: DigitalSignatureModalProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Clear password field when modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setLocalError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    setLocalError('');
    onConfirm(password);
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      setLocalError('');
      onClose();
    }
  };

  // Reset password when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setPassword('');
      setLocalError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <DialogTitle>Confirm Password</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            To confirm <strong className="text-gray-900">{action}</strong>, please enter your password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLocalError('');
              }}
              placeholder="Enter your password"
              autoFocus
              disabled={isLoading}
              className="w-full"
            />
            {(localError || error) && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{localError || error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              Your password will be verified before proceeding. This action will be logged.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !password}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Verifying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
