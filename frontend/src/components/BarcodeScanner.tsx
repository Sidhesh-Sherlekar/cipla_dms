import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Scan,
  Search,
  Printer,
  Package,
  MapPin,
  Calendar,
  User,
  FileText,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  QrCode,
} from "lucide-react";
import { useScanBarcode } from "../hooks/useBarcode";

interface CrateInfo {
  id: number;
  barcode: string;
  destruction_date: string;
  creation_date: string;
  status: string;
  storage_location: string | null;
  unit_code: string;
  unit_name: string;
  department_name: string;
  document_count: number;
  barcode_image?: string;
  qr_code?: string;
}

interface RequestInfo {
  id: number;
  request_type: string;
  status: string;
  request_date: string;
  approved_by?: {
    full_name: string;
  };
  withdrawn_by?: {
    full_name: string;
  };
  purpose?: string;
}

interface ScanResult {
  crate: CrateInfo;
  current_request: RequestInfo | null;
  history: RequestInfo[];
  total_requests: number;
}

export function BarcodeScanner() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const scanMutation = useScanBarcode();

  // Auto-focus barcode input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle barcode scan
  const handleScan = () => {
    if (!barcodeInput.trim()) {
      toast.error("Please enter a barcode");
      return;
    }

    scanMutation.mutate(barcodeInput.trim(), {
      onSuccess: (data) => {
        setScanResult(data);
        setIsResultOpen(true);
        toast.success("Barcode scanned successfully");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || "Failed to scan barcode");
        setScanResult(null);
      },
    });
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  // Print label
  const handlePrintLabel = () => {
    if (!scanResult) return;

    const printWindow = window.open(
      `/api/documents/crates/${scanResult.crate.id}/print-label/`,
      "_blank"
    );

    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }
  };

  // Navigate to request
  const navigateToRequest = (requestId: number) => {
    // Implement navigation to request details
    // This depends on your routing setup
    console.log("Navigate to request:", requestId);
  };

  // Reset scanner
  const resetScanner = () => {
    setBarcodeInput("");
    setScanResult(null);
    setIsResultOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      Active: "bg-green-500",
      Withdrawn: "bg-yellow-500",
      Archived: "bg-gray-500",
      Destroyed: "bg-red-500",
      Pending: "bg-blue-500",
      Approved: "bg-green-500",
      Rejected: "bg-red-500",
      Issued: "bg-purple-500",
      Returned: "bg-gray-500",
      Completed: "bg-green-600",
    };
    return colorMap[status] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Scanner Input Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Barcode Scanner
              </CardTitle>
              <CardDescription>
                Scan or enter a crate barcode to view details and related requests
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="barcode-input">Barcode</Label>
                <Input
                  id="barcode-input"
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="MFG01/QC/2025/00001"
                  className="font-mono"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleScan}
                  disabled={scanMutation.isPending}
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Scan
                    </>
                  )}
                </Button>
                {barcodeInput && (
                  <Button
                    variant="outline"
                    onClick={resetScanner}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Use a barcode scanner or manually enter the barcode. Format: UNIT/DEPT/YEAR/NUMBER (e.g., MFG01/QC/2025/00001)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result Dialog */}
      {scanResult && (
        <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Crate Information
              </DialogTitle>
              <DialogDescription>
                Barcode: {scanResult.crate.barcode}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Crate Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Crate Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Crate ID</Label>
                      <p className="font-semibold">#{scanResult.crate.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>
                        <Badge
                          className={getStatusColor(scanResult.crate.status)}
                        >
                          {scanResult.crate.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Unit
                      </Label>
                      <p className="font-semibold">
                        {scanResult.crate.unit_code} - {scanResult.crate.unit_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Department
                      </Label>
                      <p className="font-semibold">
                        {scanResult.crate.department_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Documents
                      </Label>
                      <p className="font-semibold">
                        {scanResult.crate.document_count} documents
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Creation Date
                      </Label>
                      <p className="font-semibold">
                        {new Date(scanResult.crate.creation_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Destruction Month
                      </Label>
                      <p className="font-semibold text-red-600">
                        {new Date(scanResult.crate.destruction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {scanResult.crate.storage_location && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Storage Location
                      </Label>
                      <p className="font-semibold font-mono text-sm">
                        {scanResult.crate.storage_location}
                      </p>
                    </div>
                  )}

                  {/* Barcode Images */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    {scanResult.crate.barcode_image && (
                      <div className="text-center">
                        <Label className="text-muted-foreground mb-2 block">Barcode</Label>
                        <img
                          src={scanResult.crate.barcode_image}
                          alt="Barcode"
                          className="mx-auto max-w-full"
                        />
                      </div>
                    )}
                    {scanResult.crate.qr_code && (
                      <div className="text-center">
                        <Label className="text-muted-foreground mb-2 block">QR Code</Label>
                        <img
                          src={scanResult.crate.qr_code}
                          alt="QR Code"
                          className="mx-auto max-w-[200px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handlePrintLabel} variant="outline">
                      <Printer className="mr-2 h-4 w-4" />
                      Print Label
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Request */}
              {scanResult.current_request && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Active Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Request Type</Label>
                        <p className="font-semibold">
                          {scanResult.current_request.request_type}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <div>
                          <Badge
                            className={getStatusColor(
                              scanResult.current_request.status
                            )}
                          >
                            {scanResult.current_request.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Request Date</Label>
                        <p className="font-semibold">
                          {new Date(
                            scanResult.current_request.request_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      {scanResult.current_request.purpose && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Purpose</Label>
                          <p className="font-semibold">
                            {scanResult.current_request.purpose}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={() =>
                          navigateToRequest(scanResult.current_request!.id)
                        }
                        variant="outline"
                        size="sm"
                      >
                        View Request Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Request History */}
              {scanResult.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Request History</CardTitle>
                    <CardDescription>
                      {scanResult.history.length} past request(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.history.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">
                              {req.request_type}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(req.status)}>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(req.request_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {req.purpose || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => navigateToRequest(req.id)}
                                variant="ghost"
                                size="sm"
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* No Requests */}
              {!scanResult.current_request && scanResult.history.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No requests found for this crate</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
