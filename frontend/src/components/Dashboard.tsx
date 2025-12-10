import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import {
  MapPin,
  AlertTriangle,
  Package,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useDashboardKPIs, useDestructionScheduleReport } from '../hooks/useReports'
import { useRequests } from '../hooks/useRequests'
import { useAuth } from '../context/AuthContext'
import { useSelectedUnit } from '../context/SelectedUnitContext'

export function Dashboard() {
  const { user } = useAuth()
  const { selectedUnit } = useSelectedUnit()
  const [activeTab, setActiveTab] = useState('storage-overview')
  const [expandedCrates, setExpandedCrates] = useState<string[]>([])

  // Fetch data from APIs - filtered by selected unit from top bar
  // For destruction schedule, show crates due in current month or earlier (past/overdue)
  const getDestructionDateRange = () => {
    const now = new Date()

    // Last day of current month
    const lastDayCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      to_date: lastDayCurrentMonth.toISOString().split('T')[0]
      // No from_date means fetch all crates from the beginning up to end of current month
    }
  }

  const dateRange = getDestructionDateRange()
  const filters = selectedUnit ? { unit_id: selectedUnit } : undefined
  const destructionFilters = {
    ...filters,
    to_date: dateRange.to_date
  }

  const { data: kpiData, isLoading: isLoadingKPIs, error: kpiError, refetch: refetchKPIs } = useDashboardKPIs(selectedUnit || undefined)
  const { data: destructionData, isLoading: isLoadingDestruction, error: destructionError } = useDestructionScheduleReport(destructionFilters)
  const { data: requestsData, isLoading: isLoadingRequests } = useRequests(undefined, undefined, selectedUnit || undefined)

  const toggleExpansion = (id: string) => {
    setExpandedCrates(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const getDaysUntilDestruction = (destructionDate: string) => {
    const today = new Date()
    const destroyDate = new Date(destructionDate)
    const diffTime = destroyDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">{Math.abs(daysUntil)} days overdue</Badge>
    } else if (daysUntil <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800">{daysUntil} days left</Badge>
    } else if (daysUntil <= 30) {
      return <Badge className="bg-blue-100 text-blue-800">{daysUntil} days left</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800">{daysUntil} days left</Badge>
    }
  }

  // Count active requests by type (excluding Completed, Rejected, and Returned statuses)
  // Valid statuses: 'Pending', 'Sent Back', 'Approved', 'Issued', 'Returned', 'Rejected', 'Completed'
  const activeStatuses = ['Pending', 'Sent Back', 'Approved', 'Issued']
  const requests = requestsData || []
  const pendingStorage = requests.filter((r: any) => r.request_type === 'Storage' && activeStatuses.includes(r.status)).length
  const pendingWithdrawal = requests.filter((r: any) => r.request_type === 'Withdrawal' && activeStatuses.includes(r.status)).length
  const pendingDestruction = requests.filter((r: any) => r.request_type === 'Destruction' && activeStatuses.includes(r.status)).length

  const renderStorageOverview = () => {
    if (isLoadingKPIs || isLoadingRequests) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (kpiError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load dashboard data</p>
            <Button onClick={() => refetchKPIs()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <p>Inprogress Requests</p>
        {/* Pending Approvals Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl text-blue-900">{pendingStorage}</div>
                  <div className="text-sm text-gray-500">New Crate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-cyan-600" />
                <div>
                  <div className="text-2xl text-cyan-900">{pendingWithdrawal}</div>
                  <div className="text-sm text-gray-500">Withdrawal</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-gray-600" />
                <div>
                  <div className="text-2xl text-gray-900">{pendingDestruction}</div>
                  <div className="text-sm text-gray-500">Destruction</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl text-blue-900">{kpiData?.total_stored_crates || 0}</div>
                  <div className="text-sm text-gray-500">Active Crates</div>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-cyan-600" />
                <div>
                  <div className="text-2xl text-cyan-900">{kpiData?.upcoming_destructions || 0}</div>
                  <div className="text-sm text-gray-500">Due This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl text-red-900">{kpiData?.overdue_returns || 0}</div>
                  <div className="text-sm text-gray-500">Overdue Returns</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl text-blue-900">{kpiData?.withdrawals_in_progress || 0}</div>
                  <div className="text-sm text-gray-500">Withdrawals In Progress</div>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl text-purple-900">{kpiData?.storage_requests_this_month || 0}</div>
                  <div className="text-sm text-gray-500">Storage Requests This Month</div>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderDestructionDue = () => {
    if (isLoadingDestruction) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )
    }

    if (destructionError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load destruction schedule</p>
          </div>
        </div>
      )
    }

    const destructionCrates = destructionData?.results || []
    const totalDocuments = destructionCrates.reduce((sum: number, crate: any) => sum + (crate.document_count || 0), 0)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Crates Due for Destruction</h2>
            {/* <p className="text-gray-600">Monitor crates and documents approaching destruction dates</p> */}
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl text-cyan-900">{destructionCrates.length}</div>
                  <div className="text-sm text-gray-500">Crates Scheduled</div>
                </div>
                <Clock className="h-8 w-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl text-red-900">
                    {destructionCrates.filter((c: any) => c.days_until_destruction < 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Overdue Crates</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl text-blue-900">{totalDocuments}</div>
                  <div className="text-sm text-gray-500">Documents to Destroy</div>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Destruction Due Table */}
        <Card>
          <CardContent className="p-0">
            {destructionCrates.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No crates due for destruction this month or earlier</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Crate ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Destruction Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destructionCrates.map((crate: any) => {
                    const daysUntil = crate.days_until_destruction
                    const isOverdue = daysUntil < 0
                    const crateId = `crate-${crate.crate_id}`

                    return (
                      <React.Fragment key={crateId}>
                        <TableRow className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpansion(crateId)}
                            >
                              {expandedCrates.includes(crateId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">CRT-{crate.crate_id}</TableCell>
                          <TableCell>{crate.unit}</TableCell>
                          <TableCell>{crate.document_count} documents</TableCell>
                          <TableCell className="text-sm">
                            {new Date(crate.destruction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            {getUrgencyBadge(daysUntil)}
                          </TableCell>
                          <TableCell className="text-sm">{crate.location}</TableCell>
                          <TableCell className="text-sm">{crate.created_by}</TableCell>
                        </TableRow>
                        {expandedCrates.includes(crateId) && crate.documents && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-gray-50 p-4">
                              <div className="space-y-2">
                                <h4 className="font-medium text-gray-900">Documents in this crate:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  {crate.documents.map((doc: any, index: number) => (
                                    <div key={`${crateId}-doc-${index}`} className="bg-white p-2 rounded border text-sm">
                                      <div className="font-medium">{doc.name}</div>
                                      <div className="text-gray-500">{doc.number}</div>
                                    </div>
                                  ))}
                                </div>
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
    { id: 'storage-overview', label: 'Storage Overview', icon: MapPin },
    { id: 'destruction-due', label: 'Due for Destruction', icon: AlertTriangle }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Dashboard</h1>
          {/* <p className="text-gray-600">Real-time overview of storage utilization and destruction schedules</p> */}
        </div>

      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="storage-overview" className="m-0">
            {renderStorageOverview()}
          </TabsContent>
          <TabsContent value="destruction-due" className="m-0">
            {renderDestructionDue()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
