import React, { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import {
  QrCode,
  Scan,
  Download,
  Package,
  FileText,
  MapPin,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Printer,
  Loader2
} from 'lucide-react'
import { useScanBarcode, downloadBarcodeImage, printCrateLabel } from '../hooks/useBarcode'

interface BarcodeGeneratorProps {
  text: string
  width?: number
  height?: number
}

function BarcodeGenerator({ text, width = 300, height = 100 }: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !text) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Simple barcode rendering (vertical bars)
    const barWidth = 3
    const barHeight = 80
    const startX = 20
    const startY = 10

    // Generate alternating pattern based on text
    ctx.fillStyle = '#000'
    let currentX = startX

    for (let i = 0; i < text.length * 10; i++) {
      const shouldDraw = (text.charCodeAt(i % text.length) + i) % 3 !== 0
      if (shouldDraw) {
        ctx.fillRect(currentX, startY, barWidth, barHeight)
      }
      currentX += barWidth + 1
    }

    // Draw text below barcode
    if (text) {
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(text, canvas.width / 2, barHeight + 35)
    }
  }, [text, width, height])

  return <canvas ref={canvasRef} width={width} height={height} className="border border-gray-300 bg-white" />
}

export function BarcodeSystem() {
  const [activeTab, setActiveTab] = useState('scan')
  const [generateCrateId, setGenerateCrateId] = useState('')
  const [scanInput, setScanInput] = useState('')

  const scanMutation = useScanBarcode()

  const navigateToTransaction = (crateId: number) => {
    // Trigger custom navigation event to transaction page
    window.dispatchEvent(
      new CustomEvent('navigateToTransaction', {
        detail: { type: 'withdrawal', crateId: crateId.toString() }
      })
    )
  }

  const handleScanBarcode = () => {
    if (!scanInput.trim()) {
      toast.error('Please enter a barcode to scan')
      return
    }

    scanMutation.mutate(scanInput.trim(), {
      onSuccess: (data) => {
        toast.success('Barcode scanned successfully')
        // Optionally navigate to a detailed view or show in a dialog
        console.log('Scan result:', data)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to scan barcode')
      }
    })
  }

  const handleGenerateBarcode = () => {
    if (!generateCrateId.match(/^[A-Z0-9]{1,20}\/[A-Za-z0-9]{1,20}\/\d{4}\/\d{1,10}$/)) {
      toast.error('Please enter a valid crate ID format: UNIT/DEPT/YEAR/NUMBER (e.g., MFG01/QC/2025/00001)')
      return
    }
    toast.success('Barcode generated')
  }

  const downloadBarcode = () => {
    const canvas = document.querySelector('canvas')
    if (canvas && generateCrateId) {
      const link = document.createElement('a')
      link.download = `barcode-${generateCrateId}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('Barcode downloaded')
    }
  }

  const printBarcode = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Barcode - ${generateCrateId}</title></head>
            <body style="text-align: center; padding: 20px;">
              <h2>Crate Barcode</h2>
              <img src="${canvas.toDataURL()}" style="max-width: 100%;" />
              <p>Crate ID: ${generateCrateId}</p>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Active': 'bg-green-500',
      'Stored': 'bg-blue-500',
      'Withdrawn': 'bg-yellow-500',
      'Destroyed': 'bg-red-500'
    }
    return variants[status] || 'bg-gray-500'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Barcode System</h1>
          {/* <p className="text-gray-500 mt-1">Generate and scan crate barcodes</p> */}
        </div>
        <Package className="h-12 w-12 text-blue-900" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Scan Barcode
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Generate Barcode
          </TabsTrigger>
        </TabsList>

        {/* Scan Barcode Tab */}
        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-blue-900" />
                <CardTitle>Scan Barcode</CardTitle>
              </div>
              <div className="text-sm text-gray-500">
                Enter or scan a barcode to view crate details and active requests
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scanInput">Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    id="scanInput"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleScanBarcode()}
                    placeholder="Enter barcode (e.g., MFG01/QC/2025/00001)"
                    className="font-mono flex-1"
                    disabled={scanMutation.isPending}
                  />
                  <Button
                    onClick={handleScanBarcode}
                    disabled={scanMutation.isPending}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    {scanMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4 mr-2" />
                        Scan
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {scanMutation.isError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {(scanMutation.error as any)?.response?.data?.error || 'Failed to scan barcode'}
                  </AlertDescription>
                </Alert>
              )}

              {scanMutation.isSuccess && scanMutation.data && (
                <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Crate Details</h3>
                    <Badge className={getStatusBadge(scanMutation.data.crate.status)}>
                      {scanMutation.data.crate.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Barcode</Label>
                      <p className="font-mono font-medium">{scanMutation.data.crate.barcode}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Unit</Label>
                      <p className="font-medium">{scanMutation.data.crate.unit_code}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Department</Label>
                      <p className="font-medium">{scanMutation.data.crate.department_name}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Documents</Label>
                      <p className="font-medium">{scanMutation.data.crate.document_count}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Created</Label>
                      <p className="font-medium">{new Date(scanMutation.data.crate.creation_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Destruction Date</Label>
                      <p className="font-medium text-red-600">{new Date(scanMutation.data.crate.destruction_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {scanMutation.data.current_request && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">Active Request</span>
                      </div>
                      <p className="text-sm">
                        Type: <span className="font-medium">{scanMutation.data.current_request.request_type}</span>
                        {' '}- Status: <span className="font-medium">{scanMutation.data.current_request.status}</span>
                      </p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => navigateToTransaction(scanMutation.data.crate.id)}
                      >
                        Go to Transaction
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => printCrateLabel(scanMutation.data.crate.id)}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Label
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Barcode Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-900" />
                <CardTitle>Generate Barcode</CardTitle>
              </div>
              <div className="text-sm text-gray-500">
                Create printable barcodes for crate identification
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crateId">Crate ID</Label>
                <Input
                  id="crateId"
                  placeholder="Enter crate ID (e.g., MFG01/QC/2025/00001)"
                  value={generateCrateId}
                  onChange={(e) => setGenerateCrateId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <div className="text-xs text-gray-500">
                  Format: UNIT/DEPT/YEAR/NUMBER (e.g., MFG01/QC/2025/00001)
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleGenerateBarcode}
                  disabled={!generateCrateId}
                  className="bg-blue-900 hover:bg-blue-800"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate Barcode
                </Button>
              </div>

              {/* Generated Barcode Display */}
              {generateCrateId && generateCrateId.match(/^[A-Z0-9]{1,20}\/[A-Za-z0-9]{1,20}\/\d{4}\/\d{1,10}$/) && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-6 bg-white text-center">
                    <BarcodeGenerator text={generateCrateId} />
                    <div className="mt-4 text-sm text-gray-600">
                      Barcode for Crate: <span className="font-mono font-medium">{generateCrateId}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={downloadBarcode} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </Button>
                    <Button onClick={printBarcode} variant="outline">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Barcode
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
