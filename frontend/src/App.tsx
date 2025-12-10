import React, { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider, useWebSocket } from "./contexts/WebSocketContext";
import { SelectedUnitProvider, useSelectedUnit } from "./context/SelectedUnitContext";
import { usePermissions } from "./hooks/usePermissions";
import { Login } from "./components/Login";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Users,
  Settings,
  Activity,
  FileBarChart,
  LayoutDashboard,
  ArrowRightLeft,
  ArrowLeft,
  ChevronRight,
  QrCode,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { useSecurityPolicies } from "./hooks/useGroups";

// Import components
import { UserManagement } from "./components/UserManagement";
import { Master } from "./components/Master";
import { Transaction } from "./components/Transaction";
import { AuditTrail } from "./components/AuditTrail";
import { Reports } from "./components/Reports";
import { Dashboard } from "./components/Dashboard";
import { BarcodeSystem } from "./components/BarcodeSystem";
import { ChangePassword } from "./components/ChangePassword";

// Note: WebSocket real-time updates now handle data synchronization
// No need for manual page reloads or POST interception

type PageType =
  | "home"
  | "user-management"
  | "master"
  | "transaction"
  | "audit-trail"
  | "report"
  | "dashboard"
  | "barcode"
  | "change-password";

const menuItems = [
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    // description: "Manage system users and roles",
    details: "Create, edit, and manage user accounts with role-based access control across organizational units."
  },
  {
    id: "master",
    label: "Master",
    icon: Settings,
    // description: "Master data configuration",
    details: "Configure organizational units, storage locations, and other master data settings for the system."
  },
  {
    id: "transaction",
    label: "Transaction",
    icon: ArrowRightLeft,
    // description: "Document transactions",
    details: "Handle document creation, allocation, withdrawal, and destruction requests with approval workflows."
  },
  {
    id: "barcode",
    label: "Barcode System",
    icon: QrCode,
    // description: "Barcode generation and scanning",
    details: "Generate barcodes for crates and scan them to view detailed reports with document contents and location information."
  },
  {
    id: "audit-trail",
    label: "Audit Trail",
    icon: Activity,
    // description: "System activity tracking",
    details: "View comprehensive logs of all system activities, user actions, and document lifecycle events."
  },
  {
    id: "report",
    label: "Report",
    icon: FileBarChart,
    // description: "Reports and analytics",
    details: "Generate detailed reports on crate storage, document inventory, and system utilization analytics."
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    // description: "System overview",
    details: "Real-time dashboard showing key metrics, alerts, and system status at a glance."
  },
];

function AppContent() {
  // ALL hooks must be called at the top, before any returns
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const { isConnected } = useWebSocket();
  const permissions = usePermissions();
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [transactionContext, setTransactionContext] = useState<any>(null);
  const { selectedUnit, setSelectedUnit } = useSelectedUnit();
  const prevAuthStateRef = useRef(isAuthenticated);

  // Note: WebSocket real-time updates now handle data synchronization
  // No need for periodic reloads

  // Fetch session timeout from security policies only when authenticated
  const { data: securityPolicies } = useSecurityPolicies();
  const sessionTimeout = securityPolicies?.session_policy?.session_timeout_minutes || 30;

  // Enable idle timeout detection only when user is authenticated
  useIdleTimeout({
    timeoutMinutes: sessionTimeout,
    enabled: isAuthenticated && !!user && !!securityPolicies,
  });

  // Define functions before any conditional returns
  const navigateTo = (page: PageType) => {
    // Prevent navigation if user must change password
    if (user?.must_change_password && page !== 'change-password') {
      toast.error('You must change your password before accessing other pages');
      return;
    }
    setCurrentPage(page);
  };

  const navigateHome = () => {
    // Prevent navigation if user must change password
    if (user?.must_change_password) {
      toast.error('You must change your password before accessing other pages');
      return;
    }
    setCurrentPage("home");
    setTransactionContext(null);
  };

  // Listen for navigation events from barcode system
  useEffect(() => {
    const handleNavigateToTransaction = (event: any) => {
      const { type, crateId, crateData } = event.detail;
      setTransactionContext({ type, crateId, crateData });
      setCurrentPage("transaction");
    };

    window.addEventListener('navigateToTransaction', handleNavigateToTransaction);

    return () => {
      window.removeEventListener('navigateToTransaction', handleNavigateToTransaction);
    };
  }, []);

  // Handle navigation after login
  useEffect(() => {
    const wasAuthenticated = prevAuthStateRef.current;
    const isNowAuthenticated = isAuthenticated;

    // Update the ref for next render
    prevAuthStateRef.current = isNowAuthenticated;

    // If user just logged in (transition from false to true)
    if (!wasAuthenticated && isNowAuthenticated && user) {
      // If user must change password, redirect to change password page
      if (user.must_change_password) {
        setCurrentPage('change-password');
      } else {
        // Otherwise, take them to home page
        setCurrentPage('home');
      }
    }
    // If already authenticated and user state changes
    else if (isNowAuthenticated && user) {
      // If user must change password, redirect to change password page
      if (user.must_change_password && currentPage !== 'change-password') {
        setCurrentPage('change-password');
      }
      // If user just finished changing password (no longer needs to change)
      else if (!user.must_change_password && currentPage === 'change-password') {
        setCurrentPage('home');
      }
    }
  }, [isAuthenticated, user]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  const getCurrentPageTitle = () => {
    const item = menuItems.find(
      (item) => item.id === currentPage,
    );
    return item ? item.label : "Document Management System";
  };

  const renderHomePage = () => {
    // Filter menu items based on user permissions
    const getVisibleMenuItems = () => {
      return menuItems.filter((item) => {
        switch (item.id) {
          case "user-management":
            return permissions.canManageUsers;
          case "master":
            return permissions.canManageMasterData;
          case "transaction":
            return permissions.canViewRequests ||
                   permissions.canCreateStorageRequest ||
                   permissions.canApproveRequests ||
                   permissions.canAllocateStorage;
          case "barcode":
            return permissions.canUseBarcodeScanner;
          case "audit-trail":
            return permissions.canViewAuditTrails;
          case "report":
            return permissions.canViewReports;
          case "dashboard":
            return permissions.canViewDashboard;
          default:
            return false;
        }
      });
    };

    const visibleMenuItems = getVisibleMenuItems();

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl text-gray-900">
            Document Management System
          </h1>
          {/* <p className="text-xl text-gray-600">
            Inventory Management System POC
          </p> */}
          <div className="flex items-center justify-center space-x-4">

          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-300 group"
                onClick={() => navigateTo(item.id as PageType)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-blue-900 transition-colors">
                    {item.label}
                  </CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCurrentPage = () => {
    // Check permissions before rendering pages
    switch (currentPage) {
      case "user-management":
        if (!permissions.canManageUsers) {
          toast.error("You don't have permission to access User Management");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <UserManagement />;
      case "master":
        if (!permissions.canManageMasterData) {
          toast.error("You don't have permission to access Master Data");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <Master />;
      case "transaction":
        if (!permissions.canViewRequests && !permissions.canCreateStorageRequest &&
            !permissions.canApproveRequests && !permissions.canAllocateStorage) {
          toast.error("You don't have permission to access Transactions");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <Transaction context={transactionContext} />;
      case "barcode":
        if (!permissions.canUseBarcodeScanner) {
          toast.error("You don't have permission to access Barcode System");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <BarcodeSystem />;
      case "audit-trail":
        if (!permissions.canViewAuditTrails) {
          toast.error("You don't have permission to access Audit Trail");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <AuditTrail />;
      case "report":
        if (!permissions.canViewReports) {
          toast.error("You don't have permission to access Reports");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <Reports />;
      case "dashboard":
        if (!permissions.canViewDashboard) {
          toast.error("You don't have permission to access Dashboard");
          setCurrentPage("home");
          return renderHomePage();
        }
        return <Dashboard />;
      case "change-password":
        return <ChangePassword />;
      default:
        return renderHomePage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              {currentPage !== "home" && (
                <Button
                  variant="outline"
                  onClick={navigateHome}
                  className="border-blue-900 text-blue-900 hover:bg-blue-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Home
                </Button>
              )}
              <div>
                <h1 className="text-2xl text-gray-900">
                  {getCurrentPageTitle()}
                </h1>
                {currentPage !== "home" && (
                  <p className="text-sm text-gray-500">
                    {
                      menuItems.find(
                        (item) => item.id === currentPage,
                      )?.description
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.full_name}</span>
                  <span className="mx-2">•</span>
                  <span>{user.role_name || user.groups[0]?.name || 'User'}</span>
                </div>
              )}
              {/* Unit Selector - only show if user has more than 1 unit */}
              {user && user.units && user.units.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Unit:</span>
                  <Select
                    value={selectedUnit?.toString() || ''}
                    onValueChange={(value) => setSelectedUnit(parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-sm">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.units.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.unit_code} - {unit.unit_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* <Badge
                variant="outline"
                className={isConnected
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"}
                title={isConnected ? "Real-time updates active" : "Connecting..."}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                {isConnected ? "Live" : "Syncing"}
              </Badge> */}

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto p-6">
          {renderCurrentPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SelectedUnitProvider>
        <WebSocketProvider>
          <AppContent />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </WebSocketProvider>
      </SelectedUnitProvider>
    </AuthProvider>
  );
}