import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import {
  Package,
  Download,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
  X
} from 'lucide-react'
import {
  useStoredDocumentsReport,
  useWithdrawnDocumentsReport,
  useOverdueReturnsReport,
  useDestructionScheduleReport
} from '../hooks/useReports'
import { useDepartments } from '../hooks/useMaster'
import { useSelectedUnit } from '../context/SelectedUnitContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export function Reports() {
  const { selectedUnit } = useSelectedUnit()
  const [activeTab, setActiveTab] = useState('storage-report')
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [exportingReport, setExportingReport] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [fromDateFilter, setFromDateFilter] = useState<string>('')
  const [toDateFilter, setToDateFilter] = useState<string>('')

  // Fetch departments for filter dropdown
  const { data: departmentsData } = useDepartments(selectedUnit || undefined)

  // Export handler function
  const handleExport = async (reportType: string, endpoint: string, baseFilename: string) => {
    setExportingReport(reportType)
    try {
      const params = new URLSearchParams()
      params.append('export', 'excel')
      if (selectedUnit) {
        params.append('unit_id', selectedUnit.toString())
      }
      if (departmentFilter) {
        params.append('department_id', departmentFilter.toString())
      }
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      if (fromDateFilter) {
        params.append('from_date', fromDateFilter)
      }
      if (toDateFilter) {
        params.append('to_date', toDateFilter)
      }

      const response = await api.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob'
      })

      // Generate filename with current date and time
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-') // HH-MM-SS
      const filename = baseFilename.replace('.xlsx', `_${dateStr}_${timeStr}.xlsx`)

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(`${filename} downloaded successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setExportingReport(null)
    }
  }

  // Build filters object
  const filters = {
    unit_id: selectedUnit || undefined,
    department_id: departmentFilter,
    status: statusFilter || undefined,
    from_date: fromDateFilter || undefined,
    to_date: toDateFilter || undefined
  }

  // Fetch report data from APIs - filtered by selected unit and other filters
  const { data: storedData, isLoading: loadingStored, error: errorStored, refetch: refetchStored } = useStoredDocumentsReport(filters)
  const { data: withdrawnData, isLoading: loadingWithdrawn, error: errorWithdrawn, refetch: refetchWithdrawn } = useWithdrawnDocumentsReport(filters)
  const { data: overdueData, isLoading: loadingOverdue, error: errorOverdue, refetch: refetchOverdue } = useOverdueReturnsReport(filters)
  const { data: destructionData, isLoading: loadingDestruction, error: errorDestruction, refetch: refetchDestruction } = useDestructionScheduleReport(filters)

  // Clear all filters
  const clearFilters = () => {
    setDepartmentFilter(undefined)
    setStatusFilter('')
    setFromDateFilter('')
    setToDateFilter('')
  }

  // Check if any filters are active
  const hasActiveFilters = departmentFilter || statusFilter || fromDateFilter || toDateFilter

  const toggleExpansion = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const renderStorageReport = () => {
    if (loadingStored) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (errorStored) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load storage report</p>
            <Button onClick={() => refetchStored()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    const requests = storedData?.results || []

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Storage Request Report</h2>
            {/* <p className="text-gray-600">All storage requests with full history and details</p> */}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('storage', '/reports/stored-documents/', 'storage_report.xlsx')}
              disabled={exportingReport === 'storage'}
            >
              {exportingReport === 'storage' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchStored()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Storage Requests: {requests.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No storage requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Crate ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Approved/Rejected By</TableHead>
                    <TableHead>Allocated By</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req: any) => {
                    const rowId = `storage-${req.request_id}`
                    const getStatusBadge = () => {
                      if (req.status === 'Completed') {
                        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      }
                      if (req.status === 'Approved') {
                        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>
                      }
                      if (req.status === 'Pending') {
                        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      }
                      if (req.status === 'Rejected') {
                        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      }
                      return <Badge className="bg-gray-100 text-gray-800">{req.status}</Badge>
                    }

                    return (
                      <React.Fragment key={rowId}>
                        <TableRow>
                          <TableCell>
                            {req.documents && req.documents.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpansion(rowId)}
                              >
                                {expandedRows.includes(rowId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">REQ-{req.request_id}</TableCell>
                          <TableCell className="font-mono text-sm">{req.barcode || `CRT-${req.crate_id}`}</TableCell>
                          <TableCell>{req.unit}</TableCell>
                          <TableCell>{getStatusBadge()}</TableCell>
                          <TableCell>{req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{req.approved_by || '-'}</TableCell>
                          <TableCell>{req.allocated_by || '-'}</TableCell>
                          <TableCell className="text-sm">{req.location}</TableCell>
                        </TableRow>
                        {expandedRows.includes(rowId) && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50 p-6">
                              <div className="space-y-4">
                                {/* Workflow Timeline */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Workflow Timeline</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-32 text-sm font-medium text-gray-700">Requested:</div>
                                      <div className="text-sm text-gray-600">
                                        {req.request_date ? new Date(req.request_date).toLocaleString('en-GB', { hour12: false }) : 'N/A'}{req.requested_by ? ` by ${req.requested_by}` : ''}
                                      </div>
                                    </div>
                                    {req.approval_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">{req.status === 'Rejected' ? 'Rejected:' : 'Approved:'}</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(req.approval_date).toLocaleString('en-GB', { hour12: false })} by {req.approved_by}
                                        </div>
                                      </div>
                                    )}
                                    {req.allocation_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">Allocated:</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(req.allocation_date).toLocaleString('en-GB', { hour12: false })} by {req.allocated_by}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Request Details */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Request Details</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Department: </span>
                                      <span className="text-sm text-gray-600">{req.department || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Destruction Date: </span>
                                      <span className="text-sm text-gray-600">{req.destruction_date || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Document Count: </span>
                                      <span className="text-sm text-gray-600">{req.document_count}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Documents */}
                                {req.documents && req.documents.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Documents:</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {req.documents.map((doc: any, index: number) => (
                                        <div key={index} className="bg-white p-3 rounded border text-sm">
                                          <div className="font-medium">{doc.name}</div>
                                          <div className="text-gray-500 text-xs">{doc.number}</div>
                                          <Badge variant="outline" className="mt-1 text-xs">
                                            {doc.type}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderWithdrawalReport = () => {
    if (loadingWithdrawn) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (errorWithdrawn) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load withdrawal report</p>
            <Button onClick={() => refetchWithdrawn()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    const withdrawals = withdrawnData?.results || []

    // Calculate summary stats
    const activeCount = withdrawals.filter((w: any) => w.status === 'Issued' && !w.is_overdue).length
    const overdueCount = withdrawals.filter((w: any) => w.is_overdue).length
    const returnedCount = withdrawals.filter((w: any) => w.status === 'Returned').length
    const completedCount = withdrawals.filter((w: any) => w.status === 'Completed').length

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Document Withdrawal Report</h2>
            {/* <p className="text-gray-600">All withdrawal requests - active and completed</p> */}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('withdrawal', '/reports/withdrawn-documents/', 'withdrawal_report.xlsx')}
              disabled={exportingReport === 'withdrawal'}
            >
              {exportingReport === 'withdrawal' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchWithdrawn()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        

        <Card>
          <CardHeader>
            <CardTitle>Total Withdrawals: {withdrawals.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {withdrawals.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No withdrawal requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Crate ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal: any) => {
                    const rowId = `withdrawal-${withdrawal.request_id}`
                    const getStatusBadge = () => {
                      if (withdrawal.is_overdue) {
                        return <Badge className="bg-red-600 text-white">Overdue</Badge>
                      }
                      if (withdrawal.status === 'Completed') {
                        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
                      }
                      if (withdrawal.status === 'Returned') {
                        return <Badge className="bg-purple-100 text-purple-800">Returned</Badge>
                      }
                      if (withdrawal.status === 'Issued') {
                        return <Badge className="bg-green-100 text-green-800">Active</Badge>
                      }
                      return <Badge className="bg-gray-100 text-gray-800">{withdrawal.status}</Badge>
                    }

                    return (
                      <React.Fragment key={rowId}>
                        <TableRow className={withdrawal.is_overdue ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpansion(rowId)}
                            >
                              {expandedRows.includes(rowId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">REQ-{withdrawal.request_id}</TableCell>
                          <TableCell className="font-mono text-sm">{withdrawal.barcode || `CRT-${withdrawal.crate_id}`}</TableCell>
                          <TableCell>{withdrawal.unit}</TableCell>
                          <TableCell>{withdrawal.withdrawn_by}</TableCell>
                          <TableCell>{withdrawal.request_date ? new Date(withdrawal.request_date).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{withdrawal.approved_by || '-'}</TableCell>
                          <TableCell>{withdrawal.issue_date ? new Date(withdrawal.issue_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{withdrawal.return_date ? new Date(withdrawal.return_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{getStatusBadge()}</TableCell>
                        </TableRow>
                        {expandedRows.includes(rowId) && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-gray-50 p-6">
                              <div className="space-y-4">
                                {/* Workflow Timeline */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Workflow Timeline</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-32 text-sm font-medium text-gray-700">Requested:</div>
                                      <div className="text-sm text-gray-600">
                                        {withdrawal.request_date ? new Date(withdrawal.request_date).toLocaleString('en-GB', { hour12: false }) : 'N/A'} by {withdrawal.withdrawn_by}
                                      </div>
                                    </div>
                                    {withdrawal.approval_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">Approved:</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(withdrawal.approval_date).toLocaleString('en-GB', { hour12: false })} by {withdrawal.approved_by}
                                        </div>
                                      </div>
                                    )}
                                    {withdrawal.issue_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">Issued:</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(withdrawal.issue_date).toLocaleString('en-GB', { hour12: false })} by {withdrawal.issued_by}
                                        </div>
                                      </div>
                                    )}
                                    {withdrawal.expected_return_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">Expected Return:</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(withdrawal.expected_return_date).toLocaleDateString()}
                                        </div>
                                      </div>
                                    )}
                                    {withdrawal.return_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">Returned:</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(withdrawal.return_date).toLocaleString('en-GB', { hour12: false })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Request Details */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Request Details</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Unit: </span>
                                      <span className="text-sm text-gray-600">{withdrawal.unit_name || withdrawal.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Requester Email: </span>
                                      <span className="text-sm text-gray-600">{withdrawal.withdrawn_by_email}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Withdrawal Type: </span>
                                      <span className="text-sm text-gray-600">{withdrawal.full_withdrawal ? 'Full Crate' : 'Partial Documents'}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Document Count: </span>
                                      <span className="text-sm text-gray-600">{withdrawal.document_count} documents</span>
                                    </div>
                                  </div>
                                  {withdrawal.purpose && (
                                    <div className="mt-3">
                                      <span className="text-sm font-medium text-gray-700">Purpose: </span>
                                      <p className="text-sm text-gray-600 mt-1">{withdrawal.purpose}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Documents */}
                                {withdrawal.documents && withdrawal.documents.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">
                                      {withdrawal.full_withdrawal ? 'All Documents in Crate:' : 'Withdrawn Documents:'}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {withdrawal.documents.map((doc: any, index: number) => (
                                        <div key={index} className="bg-white p-3 rounded border text-sm">
                                          <div className="font-medium">{doc.name}</div>
                                          <div className="text-gray-500 text-xs">{doc.number}</div>
                                          <Badge variant="outline" className="mt-1 text-xs">
                                            {doc.type}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderOverdueReport = () => {
    if (loadingOverdue) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (errorOverdue) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load overdue returns report</p>
            <Button onClick={() => refetchOverdue()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    const overdueReturns = overdueData?.results || []

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Overdue Returns Report</h2>
            {/* <p className="text-gray-600">Documents that have exceeded expected return dates</p> */}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('overdue', '/reports/overdue-returns/', 'overdue_returns_report.xlsx')}
              disabled={exportingReport === 'overdue'}
            >
              {exportingReport === 'overdue' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchOverdue()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Overdue Returns: {overdueReturns.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {overdueReturns.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No overdue returns - all documents returned on time!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Request ID</TableHead>
                    <TableHead>Crate ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Withdrawn By</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Expected Return</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Purpose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueReturns.map((item: any) => (
                    <TableRow key={item.request_id} className="bg-red-50">
                      <TableCell className="font-mono text-sm">REQ-{item.request_id}</TableCell>
                      <TableCell className="font-mono text-sm">{item.barcode || `CRT-${item.crate_id}`}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.withdrawn_by}</TableCell>
                      <TableCell className="text-sm">{item.withdrawn_by_email}</TableCell>
                      <TableCell>{item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-600 text-white">
                          {item.days_overdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDestructionReport = () => {
    if (loadingDestruction) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (errorDestruction) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load destruction schedule</p>
            <Button onClick={() => refetchDestruction()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    const destructionRequests = destructionData?.results || []

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Destruction Request Report</h2>
            {/* <p className="text-gray-600">All destruction requests with full history and details</p> */}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('destruction', '/reports/destruction-schedule/', 'destruction_schedule_report.xlsx')}
              disabled={exportingReport === 'destruction'}
            >
              {exportingReport === 'destruction' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchDestruction()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Destruction Requests: {destructionRequests.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {destructionRequests.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No destruction requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Crate ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Approved/Rejected By</TableHead>
                    <TableHead>Destruction Date</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destructionRequests.map((req: any) => {
                    const rowId = `dest-${req.request_id}`
                    const getStatusBadge = () => {
                      if (req.status === 'Completed') {
                        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      }
                      if (req.status === 'Approved') {
                        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>
                      }
                      if (req.status === 'Pending') {
                        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      }
                      if (req.status === 'Rejected') {
                        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      }
                      return <Badge className="bg-gray-100 text-gray-800">{req.status}</Badge>
                    }

                    return (
                      <React.Fragment key={rowId}>
                        <TableRow>
                          <TableCell>
                            {req.documents && req.documents.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpansion(rowId)}
                              >
                                {expandedRows.includes(rowId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">REQ-{req.request_id}</TableCell>
                          <TableCell className="font-mono text-sm">{req.barcode || `CRT-${req.crate_id}`}</TableCell>
                          <TableCell>{req.unit}</TableCell>
                          <TableCell>{getStatusBadge()}</TableCell>
                          <TableCell>{req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{req.approved_by || '-'}</TableCell>
                          <TableCell>{req.destruction_date || '-'}</TableCell>
                          <TableCell className="text-sm">{req.location || '-'}</TableCell>
                        </TableRow>
                        {expandedRows.includes(rowId) && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50 p-6">
                              <div className="space-y-4">
                                {/* Workflow Timeline */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Workflow Timeline</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-32 text-sm font-medium text-gray-700">Requested:</div>
                                      <div className="text-sm text-gray-600">
                                        {req.request_date ? new Date(req.request_date).toLocaleString('en-GB', { hour12: false }) : 'N/A'}{req.requested_by ? ` by ${req.requested_by}` : ''}
                                      </div>
                                    </div>
                                    {req.approval_date && (
                                      <div className="flex items-center space-x-3">
                                        <div className="w-32 text-sm font-medium text-gray-700">{req.status === 'Rejected' ? 'Rejected:' : 'Approved:'}</div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(req.approval_date).toLocaleString('en-GB', { hour12: false })} by {req.approved_by}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Request Details */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3">Request Details</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Department: </span>
                                      <span className="text-sm text-gray-600">{req.department || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">Document Count: </span>
                                      <span className="text-sm text-gray-600">{req.document_count}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Documents */}
                                {req.documents && req.documents.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Documents:</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {req.documents.map((doc: any, index: number) => (
                                        <div key={index} className="bg-white p-3 rounded border text-sm">
                                          <div className="font-medium">{doc.name}</div>
                                          <div className="text-gray-500 text-xs">{doc.number}</div>
                                          {doc.type && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              {doc.type}
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: 'storage-report', label: 'Storage Report', icon: Package },
    { id: 'withdrawal-report', label: 'Withdrawal Report', icon: Download },
    { id: 'overdue-report', label: 'Overdue Returns', icon: AlertTriangle },
    { id: 'destruction-report', label: 'Destruction Details', icon: Trash2 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Reports</h1>
          {/* <p className="text-gray-600">Comprehensive document management system reports</p> */}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5">!</span>}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={departmentFilter || ''}
                  onChange={(e) => setDepartmentFilter(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departmentsData?.results?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Issued">Issued</option>
                  <option value="Returned">Returned</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* From Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDateFilter}
                  onChange={(e) => setFromDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDateFilter}
                  onChange={(e) => setToDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="storage-report" className="m-0">
            {renderStorageReport()}
          </TabsContent>
          <TabsContent value="withdrawal-report" className="m-0">
            {renderWithdrawalReport()}
          </TabsContent>
          <TabsContent value="overdue-report" className="m-0">
            {renderOverdueReport()}
          </TabsContent>
          <TabsContent value="destruction-report" className="m-0">
            {renderDestructionReport()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
