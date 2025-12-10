import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import {
  Activity,
  Search,
  Filter,
  FileText,
  MapPin,
  Clock,
  Eye,
  Loader2,
  LogIn,
  LogOut,
  XCircle
} from 'lucide-react'
import { useAuditTrail } from '../hooks/useAudit'

export function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50) // Items per page

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch audit data from API with pagination
  const { data: auditResponse, isLoading } = useAuditTrail(
    filterAction !== 'all' ? filterAction : undefined,
    undefined,
    undefined,
    dateFrom || undefined,
    dateTo || undefined,
    debouncedSearch || undefined,
    currentPage,
    pageSize
  )

  const auditData = auditResponse?.results || []
  const totalCount = auditResponse?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  // Predefined action types for filtering
  const actionTypes = [
    'Created', 'Updated', 'Deleted', 'Approved', 'Rejected',
    'Allocated', 'Issued', 'Returned', 'Viewed', 'Send Back',
    'Login', 'LoginFailed', 'Logout', 'SessionTimeout', 'SessionTerminated'
  ]

  // Extract reason from message if present
  const extractReason = (message: string): string | null => {
    // Match patterns like "Reason: ..." or ". Reason: ..."
    const reasonMatch = message.match(/Reason:\s*(.+)$/i)
    if (reasonMatch) {
      return reasonMatch[1].trim()
    }
    return null
  }

  // Remove reason from message for cleaner display
  const getMessageWithoutReason = (message: string): string => {
    return message.replace(/\.\s*Reason:\s*.+$/i, '').trim()
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Created':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800 p-1"><Clock className="h-3 w-3" /></Badge>
      case 'Allocated':
        return <MapPin className="h-4 w-4 text-green-600" />
      case 'Issued':
        return <FileText className="h-4 w-4 text-cyan-600" />
      case 'Returned':
        return <FileText className="h-4 w-4 text-purple-600" />
      case 'Deleted':
        return <Badge className="bg-gray-100 text-gray-800 p-1"><Clock className="h-3 w-3" /></Badge>
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 p-1"><Clock className="h-3 w-3" /></Badge>
      case 'Updated':
        return <Activity className="h-4 w-4 text-blue-600" />
      case 'Viewed':
        return <Eye className="h-4 w-4 text-gray-600" />
      case 'Login':
        return <LogIn className="h-4 w-4 text-green-600" />
      case 'LoginFailed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'Logout':
        return <LogOut className="h-4 w-4 text-orange-600" />
      case 'SessionTimeout':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'SessionTerminated':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">Audit Trail</h1>
        {/* <p className="text-gray-600">Complete system activity log with full traceability</p> */}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users, actions, crates, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Action</Label>
              <Select value={filterAction} onValueChange={(value) => {
                setFilterAction(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {auditData.length} of {totalCount} entries (Page {currentPage} of {totalPages})
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-28">Timestamp</TableHead>
                <TableHead className="w-32">User</TableHead>
                <TableHead className="w-24">Action</TableHead>
                <TableHead className="w-24">Request ID</TableHead>
                <TableHead className="w-24">Crate ID</TableHead>
                <TableHead className="w-64">Message</TableHead>
                <TableHead className="w-48">Reason</TableHead>
                <TableHead className="w-28">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No audit trail entries found
                  </TableCell>
                </TableRow>
              ) : (
                auditData.map((entry: any) => {
                  const user = entry.user_name || entry.username || 'Unknown'
                  const action = entry.action || ''
                  const requestId = entry.request_id || null
                  const crateId = entry.crate_id || null
                  const timestamp = entry.action_time || ''
                  const message = entry.message || ''
                  const ipAddress = entry.ip_address || 'N/A'
                  const reason = extractReason(message)
                  const displayMessage = reason ? getMessageWithoutReason(message) : message

                  return (
                    <TableRow key={entry.id} className="hover:bg-gray-50 align-top">
                      <TableCell className="pt-3">
                        {getActionIcon(action)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div>
                          <div>{new Date(timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user}</div>
                          {entry.username && (
                            <div className="text-xs text-gray-500">
                              @{entry.username}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {requestId ? `REQ-${requestId}` : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {crateId ? `CRATE-${crateId}` : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        <div className="whitespace-pre-wrap break-words">
                          {displayMessage}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        {reason ? (
                          <div className="whitespace-pre-wrap break-words text-red-600 font-medium">
                            {reason}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {ipAddress}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls at Bottom */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({totalCount} total entries)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "bg-blue-900 hover:bg-blue-800" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl text-blue-900">
                  {auditData.filter((item: any) => item.action === 'Created').length}
                </div>
                <div className="text-sm text-gray-500">Created (Page)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl text-green-900">
                  {auditData.filter((item: any) => item.action === 'Approved').length}
                </div>
                <div className="text-sm text-gray-500">Approvals (Page)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl text-purple-900">
                  {auditData.filter((item: any) => item.action === 'Allocated').length}
                </div>
                <div className="text-sm text-gray-500">Allocated (Page)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-cyan-600" />
              <div>
                <div className="text-2xl text-cyan-900">
                  {totalCount}
                </div>
                <div className="text-sm text-gray-500">Total Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}