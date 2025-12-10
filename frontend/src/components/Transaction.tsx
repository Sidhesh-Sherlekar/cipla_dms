import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import toast from "react-hot-toast";
import {
  Plus,
  FileText,
  CheckCircle,
  UserCheck,
  ArrowRightLeft,
  Calendar,
  Package,
  Eye,
  Edit,
  Lock,
  Pause,
  X,
  MapPin,
  ArrowLeft,
  Loader2,
  Search,
  ChevronsUpDown,
  Check,
  PackageOpen,
} from "lucide-react";
import { useCratesInStorage, useRelocateCrate, useCrates } from '../hooks/useCrates';
import {
  useRequests,
  useApproveRequest,
  useRejectRequest,
  useSendBackRequest,
  useAllocateStorage,
  useCreateStorageRequest,
  useCreateWithdrawalRequest,
  useCreateDestructionRequest,
  useUpdateStorageRequest,
  useUpdateWithdrawalRequest,
  useUpdateDestructionRequest,
  useIssueDocuments,
  useReturnDocuments,
} from '../hooks/useRequests';
import { useAuth } from '../context/AuthContext';
import { useSelectedUnit } from '../context/SelectedUnitContext';
import { usePermissions } from '../hooks/usePermissions';
import { useUnits, useDepartments, useSections } from '../hooks/useMaster';
import { useStorage } from '../hooks/useStorage';
import { DigitalSignatureModal } from './DigitalSignatureModal';

interface TransactionProps {
  context?: {
    type: string;
    crateId: string;
    crateData: any;
  } | null;
}

export function Transaction({
  context,
}: TransactionProps = {}) {
  const { user } = useAuth();
  const { selectedUnit: globalSelectedUnit } = useSelectedUnit();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState("new-request");
  const [requestType, setRequestType] = useState("");
  const [selectedCrate, setSelectedCrate] = useState("");
  const [crateSearchOpen, setCrateSearchOpen] = useState(false);
  const [crateSearchQuery, setCrateSearchQuery] = useState("");
  const [storageSearchOpen, setStorageSearchOpen] = useState(false);
  const [storageSearchQuery, setStorageSearchQuery] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<
    string[]
  >([]);
  const [documents, setDocuments] = useState([
    { name: "", type: "" },
  ]);
  const [expandedRequests, setExpandedRequests] = useState<
    string[]
  >([]);
  const [isFullWithdrawal, setIsFullWithdrawal] =
    useState(false);

  // Storage allocation states
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedRack, setSelectedRack] = useState("");
  const [selectedCompartment, setSelectedCompartment] =
    useState("");
  const [selectedShelf, setSelectedShelf] = useState("");

  // Relocation states
  const [relocationUnit, setRelocationUnit] = useState("");
  const [relocationRoom, setRelocationRoom] = useState("");
  const [relocationRack, setRelocationRack] = useState("");
  const [relocationCompartment, setRelocationCompartment] = useState("");
  const [relocationShelf, setRelocationShelf] = useState("");

  // Department and Section states
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Destruction date and generated Crate ID
  const [destructionDate, setDestructionDate] = useState("");
  const [generatedCrateId, setGeneratedCrateId] = useState("");

  // Crate options checkboxes
  const [toCentral, setToCentral] = useState(false);
  const [toBeRetained, setToBeRetained] = useState(false);

  // Edit sent-back request states
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [editedRequestData, setEditedRequestData] = useState<any>(null);

  // Digital Signature Modal states
  const [signatureModal, setSignatureModal] = useState({
    isOpen: false,
    action: '',
    onConfirm: (password: string) => {},
  });
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isSignatureLoading, setIsSignatureLoading] = useState(false);

  // Fetch data from APIs
  // Use useCratesInStorage WITHOUT unit filter to get all crates from all user's units
  // Backend now filters by all user's accessible units when no unit_id is provided
  const { data: cratesData, isLoading: loadingCrates, refetch: refetchCrates } = useCratesInStorage();
  // Fetch all active crates (for edit mode when crate might not have storage yet)
  const { data: allCratesData } = useCrates('Active');
  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } = useRequests(undefined, undefined, globalSelectedUnit);
  const { data: unitsData, isLoading: loadingUnits } = useUnits();
  const { data: departmentsData, isLoading: loadingDepartments } = useDepartments(globalSelectedUnit);
  const { data: sectionsData, isLoading: loadingSections } = useSections();
  const { data: storageData, isLoading: loadingStorage } = useStorage(selectedUnit ? parseInt(selectedUnit) : globalSelectedUnit);

  // Fetch crates for rearrangement (selected unit)
  const { data: userUnitCratesData, refetch: refetchUserCrates } = useCratesInStorage(globalSelectedUnit);

  // Fetch storage for relocation
  const { data: relocationStorageData } = useStorage(relocationUnit ? parseInt(relocationUnit) : globalSelectedUnit);

  // Mutations
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const sendBackRequest = useSendBackRequest();
  const allocateStorage = useAllocateStorage();
  const createStorageRequest = useCreateStorageRequest();
  const createWithdrawalRequest = useCreateWithdrawalRequest();
  const createDestructionRequest = useCreateDestructionRequest();
  const updateStorageRequest = useUpdateStorageRequest();
  const updateWithdrawalRequest = useUpdateWithdrawalRequest();
  const updateDestructionRequest = useUpdateDestructionRequest();
  const issueDocuments = useIssueDocuments();
  const returnDocuments = useReturnDocuments();
  const relocateCrate = useRelocateCrate();

  // Extract data from API responses
  // Crates that are in storage (have storage allocated) - used for withdrawal and destruction
  const cratesInStorage = cratesData?.results || [];
  // All active crates (including those without storage) - used when editing sent-back requests
  const allActiveCrates = allCratesData?.results || [];
  const allRequests = requestsData || [];
  const storageLocations = storageData?.results || [];
  const userUnitCrates = userUnitCratesData?.results || [];
  const relocationStorageLocations = relocationStorageData?.results || [];

  console.log('Raw cratesData:', cratesData);
  console.log('cratesInStorage:', cratesInStorage);
  console.log('cratesInStorage length:', cratesInStorage.length);
  console.log('loadingCrates:', loadingCrates);
  console.log('Raw requestsData:', requestsData);
  console.log('allRequests:', allRequests);
  console.log('allRequests length:', allRequests.length);
  console.log('selectedUnit:', selectedUnit);
  console.log('globalSelectedUnit:', globalSelectedUnit);
  console.log('Raw storageData:', storageData);
  console.log('storageLocations:', storageLocations);
  console.log('storageLocations length:', storageLocations.length);
  console.log('loadingStorage:', loadingStorage);

  const pendingRequests = allRequests.filter(r => r.status === 'Pending');
  const sentBackRequests = allRequests.filter(r => r.status === 'Sent Back');
  const approvedRequests = allRequests.filter(r => r.status === 'Approved' || r.status === 'Issued');
  const activeRequests = allRequests.filter(r => ['Pending', 'Approved', 'Issued'].includes(r.status));

  console.log('Pending requests:', pendingRequests.length);
  console.log('Approved requests:', approvedRequests.length);
  console.log('Active requests:', activeRequests.length);

  // Get units, departments, sections from API
  // Note: The backend now returns only units the user has access to
  const units = unitsData?.results || [];
  const departments = departmentsData?.results || [];
  const sections = sectionsData?.results || [];

  // Auto-select unit if user has access to only one unit
  useEffect(() => {
    if (units.length === 1 && !selectedUnit) {
      setSelectedUnit(units[0].id.toString());
    }
  }, [units, selectedUnit]);

  // Filter departments based on selected unit
  const filteredDepartments = selectedUnit
    ? departments.filter(d => d.unit.id.toString() === selectedUnit)
    : departments;

  // Filter sections based on selected department
  const filteredSections = selectedDepartment
    ? sections.filter(s => s.department.id.toString() === selectedDepartment)
    : sections;

  // Dynamic storage dropdowns based on actual storage locations
  // Get unique rooms for the selected unit (storage API already filters by unit)
  // Storage locations are already filtered by backend based on selectedUnit or globalSelectedUnit
  const availableRooms = storageLocations.length > 0
    ? [...new Set(storageLocations.map(s => s.room_name))].sort()
    : [];

  // Get unique racks for the selected unit and room
  const availableRacks = selectedRoom
    ? [...new Set(
        storageLocations
          .filter(s => s.room_name === selectedRoom)
          .map(s => s.rack_name)
      )].sort()
    : [];

  // Get unique compartments for selected unit, room, and rack
  const availableCompartments = selectedRoom && selectedRack
    ? [...new Set(
        storageLocations
          .filter(s => s.room_name === selectedRoom && s.rack_name === selectedRack)
          .map(s => s.compartment_name)
      )].sort()
    : [];

  // Get unique shelves for selected unit, room, rack, and compartment
  const availableShelves = selectedRoom && selectedRack && selectedCompartment
    ? [...new Set(
        storageLocations
          .filter(s =>
            s.room_name === selectedRoom &&
            s.rack_name === selectedRack &&
            s.compartment_name === selectedCompartment &&
            s.shelf_name  // Only include locations that have shelves
          )
          .map(s => s.shelf_name)
      )].sort()
    : [];

  // Check if the selected unit has 3-level or 4-level storage
  const hasShelfLevel = storageLocations.some(s => s.shelf_name !== null && s.shelf_name !== '');

  // Helper function to extract short code from storage names (e.g., "Rack-1" -> "1", "Compartment A" -> "A")
  const extractShortCode = (name: string): string => {
    if (!name) return '';
    // Remove common prefixes and extract the identifier
    const cleaned = name.replace(/^(Rack|Compartment|Shelf|Room)[-_\s]*/i, '').trim();
    return cleaned || name;
  };

  // Combined storage locations (Rack / Compartment / Shelf) for searchable dropdown
  const combinedStorageLocations = selectedRoom
    ? storageLocations
        .filter(s => s.room_name === selectedRoom)
        .map(s => {
          const rackShort = extractShortCode(s.rack_name);
          const compShort = extractShortCode(s.compartment_name);
          const shelfShort = s.shelf_name ? extractShortCode(s.shelf_name) : '';

          // Create compact display code like "1A1" or "1A" (no separators)
          const compactCode = hasShelfLevel && shelfShort
            ? `${rackShort}${compShort}${shelfShort}`
            : `${rackShort}${compShort}`;

          return {
            rack: s.rack_name,
            compartment: s.compartment_name,
            shelf: s.shelf_name,
            rackShort,
            compShort,
            shelfShort,
            compactCode,
            // Search text includes compact code, full names, and variations
            searchText: `${compactCode} ${s.rack_name} ${s.compartment_name} ${s.shelf_name || ''}`.toLowerCase(),
            storageId: s.id
          };
        })
        // Remove duplicates based on rack, compartment, shelf combination
        .filter((item, index, self) =>
          index === self.findIndex(t =>
            t.rack === item.rack &&
            t.compartment === item.compartment &&
            t.shelf === item.shelf
          )
        )
        .sort((a, b) => a.compactCode.localeCompare(b.compactCode, undefined, { numeric: true }))
    : [];

  // Get current combined storage selection for display
  const currentStorageSelection = selectedRack && selectedCompartment
    ? combinedStorageLocations.find(s =>
        s.rack === selectedRack &&
        s.compartment === selectedCompartment &&
        (hasShelfLevel ? s.shelf === selectedShelf : true)
      )
    : null;

  // Relocation cascading dropdowns
  const relocationAvailableRooms = [...new Set(relocationStorageLocations.map(s => s.room_name))].sort();

  const relocationAvailableRacks = relocationRoom
    ? [...new Set(
        relocationStorageLocations
          .filter(s => s.room_name === relocationRoom)
          .map(s => s.rack_name)
      )].sort()
    : [];

  const relocationAvailableCompartments = relocationRoom && relocationRack
    ? [...new Set(
        relocationStorageLocations
          .filter(s => s.room_name === relocationRoom && s.rack_name === relocationRack)
          .map(s => s.compartment_name)
      )].sort()
    : [];

  const relocationAvailableShelves = relocationRoom && relocationRack && relocationCompartment
    ? [...new Set(
        relocationStorageLocations
          .filter(s =>
            s.room_name === relocationRoom &&
            s.rack_name === relocationRack &&
            s.compartment_name === relocationCompartment &&
            s.shelf_name
          )
          .map(s => s.shelf_name)
      )].sort()
    : [];

  const relocationHasShelfLevel = relocationStorageLocations.some(s => s.shelf_name !== null && s.shelf_name !== '');

  // Function to generate Crate ID
  // Format: [unit_code]/[dept_name]/[section_name]/[year]/[sequential number]
  // Section is optional - if not provided, format is [unit_code]/[dept_name]/[year]/[sequential number]
  const generateCrateId = (
    unitId: string,
    departmentId: string,
    sectionId: string
  ): string => {
    if (!unitId || !departmentId) {
      return "";
    }

    const selectedUnitObj = units.find(u => u.id.toString() === unitId);
    const selectedDeptObj = departments.find(d => d.id.toString() === departmentId);
    const selectedSectObj = sectionId ? sections.find(s => s.id.toString() === sectionId) : null;

    if (!selectedUnitObj || !selectedDeptObj) {
      return "";
    }

    // Use current year (crate creation year) for the Crate ID
    const year = new Date().getFullYear();

    // Generate sequential number (mock - in production this would come from backend)
    const timestamp = Date.now();
    const sequentialNumber = String((timestamp % 99) + 1).padStart(2, "0");

    // Build crate ID with optional section
    if (selectedSectObj) {
      // Clean section name (remove spaces and special characters)
      const sectionNameClean = selectedSectObj.section_name.replace(/\s+/g, '').replace(/-/g, '').slice(0, 10);
      return `${selectedUnitObj.unit_code}/${selectedDeptObj.department_name}/${sectionNameClean}/${year}/${sequentialNumber}`;
    } else {
      return `${selectedUnitObj.unit_code}/${selectedDeptObj.department_name}/${year}/${sequentialNumber}`;
    }
  };

  // Update Crate ID when relevant fields change (unit, department, section)
  useEffect(() => {
    if (requestType === "new-crate") {
      const newCrateId = generateCrateId(
        selectedUnit,
        selectedDepartment,
        selectedSection
      );
      setGeneratedCrateId(newCrateId);
    }
  }, [selectedUnit, selectedDepartment, selectedSection, requestType]);

  // Handle context from barcode system
  useEffect(() => {
    if (context) {
      // Set the request type based on the context
      if (context.type === "withdrawal") {
        setRequestType("withdrawal");
        setSelectedCrate(context.crateId);
      } else if (context.type === "destruction") {
        setRequestType("destruction");
        setSelectedCrate(context.crateId);
      } else if (context.type === "allocation") {
        setActiveTab("allocation");
        setSelectedCrate(context.crateId);
      }
    }
  }, [context]);

  // Set default active tab based on user permissions
  useEffect(() => {
    // Build the available tabs based on permissions
    const availableTabs: string[] = [];
    if (permissions.canCreateStorageRequest) availableTabs.push("new-request");
    if (permissions.canApproveRequests) availableTabs.push("approval");
    if (permissions.canAllocateStorage) {
      availableTabs.push("allocation");
      availableTabs.push("withdrawal");
    }
    if (permissions.canRelocateCrate) availableTabs.push("rearrangement");

    // If current active tab is not available to user, switch to first available tab
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [permissions, activeTab]);

  // Auto-select unit for new crate creation
  useEffect(() => {
    if (requestType === "new-crate" && !selectedUnit && units.length > 0) {
      // Priority 1: Use globalSelectedUnit from top bar if it's in the user's units
      if (globalSelectedUnit) {
        const unitInList = units.find(u => u.id === globalSelectedUnit);
        if (unitInList) {
          setSelectedUnit(globalSelectedUnit.toString());
          return;
        }
      }
      // Priority 2: Auto-select if user has only one unit
      if (units.length === 1) {
        setSelectedUnit(units[0].id.toString());
      }
    }
  }, [requestType, globalSelectedUnit, units, selectedUnit]);

  // Loading state
  if (loadingCrates || loadingRequests) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Approval handler
  const handleApprove = async (requestId: number) => {
    setSignatureModal({
      isOpen: true,
      action: 'Approve Request',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          await approveRequest.mutateAsync({
            request_id: requestId,
            digital_signature: password
          });

          await refetchRequests();
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
          toast.success('Request approved successfully');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  // Rejection handler
  const handleReject = async (requestId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setSignatureModal({
      isOpen: true,
      action: 'Reject Request',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          const response = await rejectRequest.mutateAsync({
            request_id: requestId,
            reason,
            digital_signature: password
          });

          await refetchRequests();
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
          // Use the message from the server response (e.g., "rejected" or "canceled")
          toast.success(response.message || 'Request rejected successfully');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  // Send back handler
  const handleSendBack = async (requestId: number) => {
    const reason = prompt('Enter reason for sending back (what changes are required):\n(Minimum 10 characters)');
    if (!reason) return;

    // Validate reason length
    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    setSignatureModal({
      isOpen: true,
      action: 'Send Back Request',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          await sendBackRequest.mutateAsync({
            request_id: requestId,
            reason: reason.trim(),
            digital_signature: password
          });

          await refetchRequests();
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
          toast.success('Request sent back for modifications');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  // Storage allocation handler
  const handleAllocateStorage = async (requestId: number) => {
    // For 3-level storage, shelf is not required
    const requiresShelf = hasShelfLevel;

    if (!selectedUnit || !selectedRoom || !selectedRack || !selectedCompartment) {
      toast.error('Please select room, rack, and compartment');
      return;
    }

    if (requiresShelf && !selectedShelf) {
      toast.error('Please select a shelf');
      return;
    }

    // Find the existing storage location from the fetched storage data
    const existingStorage = storageLocations.find(s =>
      s.room_name === selectedRoom &&
      s.rack_name === selectedRack &&
      s.compartment_name === selectedCompartment &&
      (requiresShelf ? s.shelf_name === selectedShelf : true)
    );

    if (!existingStorage) {
      toast.error('Storage location not found. Please select a valid storage location.');
      return;
    }

    // Open digital signature modal for storage allocation
    setSignatureModal({
      isOpen: true,
      action: 'Allocate Storage',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          // Now allocate the storage to the request
          await allocateStorage.mutateAsync({
            request_id: requestId,
            storage: existingStorage.id,
            digital_signature: password
          });

          await refetchRequests();
          await refetchCrates();
          toast.success('Storage allocated successfully');

          // Close the expanded row
          setExpandedRequests((prev) => prev.filter((id) => id !== requestId.toString()));

          // Reset selection
          setSelectedUnit('');
          setSelectedRoom('');
          setSelectedRack('');
          setSelectedCompartment('');
          setSelectedShelf('');

          // Close modal on success
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
        } catch (error: any) {
          console.error('Storage allocation error:', error);
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  const handleReturnDocuments = async (requestId: number) => {
    // For 3-level storage, shelf is not required
    const requiresShelf = hasShelfLevel;

    if (!selectedUnit || !selectedRoom || !selectedRack || !selectedCompartment) {
      toast.error('Please select room, rack, and compartment');
      return;
    }

    if (requiresShelf && !selectedShelf) {
      toast.error('Please select a shelf');
      return;
    }

    // Find the existing storage location from the fetched storage data
    const existingStorage = storageLocations.find(s =>
      s.room_name === selectedRoom &&
      s.rack_name === selectedRack &&
      s.compartment_name === selectedCompartment &&
      (requiresShelf ? s.shelf_name === selectedShelf : true)
    );

    if (!existingStorage) {
      toast.error('Storage location not found. Please select a valid storage location.');
      return;
    }

    // Open digital signature modal for returning documents
    setSignatureModal({
      isOpen: true,
      action: 'Return Documents & Allocate Storage',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          // Return documents and allocate storage
          await returnDocuments.mutateAsync({
            request_id: requestId,
            storage: existingStorage.id,
            digital_signature: password
          });

          await refetchRequests();
          await refetchCrates();
          toast.success('Documents returned and storage allocated successfully');

          // Close the expanded row
          setExpandedRequests((prev) => prev.filter((id) => id !== requestId.toString()));

          // Reset selection
          setSelectedUnit('');
          setSelectedRoom('');
          setSelectedRack('');
          setSelectedCompartment('');
          setSelectedShelf('');

          // Close modal on success
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
        } catch (error: any) {
          console.error('Return documents error:', error);
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  // Relocation handler
  const handleRelocateCrate = async (crateId: number) => {
    const requiresShelf = relocationHasShelfLevel;

    if (!relocationUnit || !relocationRoom || !relocationRack || !relocationCompartment) {
      toast.error('Please select room, rack, and compartment');
      return;
    }

    if (requiresShelf && !relocationShelf) {
      toast.error('Please select a shelf');
      return;
    }

    // Find the existing storage location
    const existingStorage = relocationStorageLocations.find(s =>
      s.room_name === relocationRoom &&
      s.rack_name === relocationRack &&
      s.compartment_name === relocationCompartment &&
      (requiresShelf ? s.shelf_name === relocationShelf : true)
    );

    if (!existingStorage) {
      toast.error('Storage location not found. Please select a valid storage location.');
      return;
    }

    // Open digital signature modal for relocation
    setSignatureModal({
      isOpen: true,
      action: 'Relocate Crate',
      onConfirm: async (password: string) => {
        setIsSignatureLoading(true);
        setSignatureError(null);

        try {
          await relocateCrate.mutateAsync({
            crate_id: crateId,
            storage_id: existingStorage.id,
            digital_signature: password
          });

          await refetchUserCrates();
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
          toast.success('Crate relocated successfully');

          // Reset relocation selection
          setRelocationUnit('');
          setRelocationRoom('');
          setRelocationRack('');
          setRelocationCompartment('');
          setRelocationShelf('');

          // Close the expansion
          toggleRequestExpansion(String(crateId));
        } catch (error: any) {
          console.error('Relocation error:', error);
          const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
          setSignatureError(errorMessage);

          // Reset relocation selection on error to prevent stale state
          setRelocationUnit('');
          setRelocationRoom('');
          setRelocationRack('');
          setRelocationCompartment('');
          setRelocationShelf('');
        } finally {
          setIsSignatureLoading(false);
        }
      }
    });
  };

  const toggleRequestExpansion = (requestId: string) => {
    setExpandedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId],
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            {status}
          </Badge>
        );
      case "Approved":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            {status}
          </Badge>
        );
      case "In Storage":
        return (
          <Badge className="bg-green-100 text-green-800">
            {status}
          </Badge>
        );
      case "Issued":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            {status}
          </Badge>
        );
      case "Returned":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {status}
          </Badge>
        );
      case "Destroyed":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const addDocument = () => {
    setDocuments([...documents, { name: "", type: "" }]);
  };

  const removeDocument = (index: number) => {
    if (documents.length > 1) {
      setDocuments(documents.filter((_, i) => i !== index));
    }
  };

  const updateDocument = (
    index: number,
    field: "name" | "type",
    value: string,
  ) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  const handleDocumentSelection = (docId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const renderNewRequestForm = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">New Request</h2>
      </div>

      <Card>
        
        <CardContent className="space-y-6 mt-4">
          {/* Context Alert from Barcode System */}
          {context && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Package className="h-4 w-4" />
                <span className="font-medium">
                  Request initiated from Barcode System
                </span>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                Crate:{" "}
                <span className="font-mono font-medium">
                  {context.crateId}
                </span>{" "}
                - Request Type:{" "}
                <span className="capitalize">
                  {context.type}
                </span>
              </div>

            </div>
          )}

          {/* Request Type Selection */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select
              value={requestType}
              onValueChange={setRequestType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-crate">
                  New Crate
                </SelectItem>
                <SelectItem value="withdrawal">
                  Withdrawal
                </SelectItem>
                <SelectItem value="destruction">
                  Destruction
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Form Fields Based on Request Type */}
          {requestType === "new-crate" && (
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Crate ID (Auto-generated)</Label>
                  <Input
                    value={generatedCrateId || ""}
                    disabled
                    placeholder="Select unit, dept, section & date"
                    className={generatedCrateId ? "font-mono text-blue-900" : ""}
                  />
                  {/* <p className="text-xs text-gray-500">
                      Format: [unit_code]/[dept_name]/[year]/[number]
                    </p> */}
                </div>
                <div className="space-y-2">
                  <Label>Unit <span className="text-blue-600">*</span></Label>
                  <Select
                    value={selectedUnit}
                    onValueChange={(value) => {
                      setSelectedUnit(value);
                      setSelectedDepartment("");
                      setSelectedSection("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.unit_code} {unit.unit_name ? `- ${unit.unit_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department <span className="text-blue-600">*</span></Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(value) => {
                      setSelectedDepartment(value);
                      setSelectedSection("");
                    }}
                    disabled={!selectedUnit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section <span className="text-gray-400">(Optional)</span></Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={!selectedDepartment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section (if applicable)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>
                          {section.section_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Crate Options Checkboxes */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">Crate Options</h4>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toCentral"
                    checked={toCentral}
                    onCheckedChange={(checked) => setToCentral(checked as boolean)}
                  />
                  <Label
                    htmlFor="toCentral"
                    className="text-sm cursor-pointer"
                  >
                    <span className="font-medium">To Central</span> - Send this crate to central storage (visible to store heads with central unit access)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="toBeRetained"
                    checked={toBeRetained}
                    onCheckedChange={(checked) => setToBeRetained(checked as boolean)}
                  />
                  <Label
                    htmlFor="toBeRetained"
                    className="text-sm cursor-pointer"
                  >
                    <span className="font-medium">To Be Retained</span> - Retain indefinitely (no destruction date required)
                  </Label>
                </div>
              </div>

              {/* Conditional Destruction Date */}
              {!toBeRetained && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Destruction Month <span className="text-blue-600">*</span></Label>
                    <Input
                      type="month"
                      value={destructionDate}
                      onChange={(e) => setDestructionDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {toBeRetained && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Note:</span> Destruction date is not required for crates marked as "To Be Retained". This crate will be retained indefinitely.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Documents (All documents must have same
                    destruction date)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDocument}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </div>

                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-5">
                        <Label className="text-sm">
                          Document Name
                        </Label>
                        <Input
                          value={doc.name}
                          onChange={(e) =>
                            updateDocument(
                              index,
                              "name",
                              e.target.value,
                            )
                          }
                          placeholder="Enter document name"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-sm">
                          Document Type
                        </Label>
                        <Input
                          value={doc.type}
                          onChange={(e) =>
                            updateDocument(index, "type", e.target.value)
                          }
                          placeholder="Enter document type"
                        />
                      </div>
                      <div className="col-span-2">
                        {documents.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              removeDocument(index)
                            }
                            className="w-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {requestType === "withdrawal" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Crate</Label>
                <Popover open={crateSearchOpen} onOpenChange={setCrateSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={crateSearchOpen}
                      className="w-full justify-between h-auto min-h-10"
                      disabled={loadingCrates}
                    >
                      {selectedCrate ? (
                        <div className="flex flex-col items-start text-left">
                          <div className="font-mono text-sm">
                            {(editingRequestId ? allActiveCrates : cratesInStorage).find(c => String(c.id) === selectedCrate)?.barcode || `Crate ${selectedCrate}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {loadingCrates ? "Loading crates..." : (editingRequestId ? allActiveCrates : cratesInStorage).length === 0 ? "No crates available" : "Search and select a crate..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-white border-2" align="start">
                    <div className="flex items-center gap-2 border-b-2 border-gray-300 px-3 py-3 bg-gray-50">
                      <Search className="h-5 w-5 text-blue-600" />
                      <input
                        type="text"
                        placeholder="Type to search crates..."
                        value={crateSearchQuery}
                        onChange={(e) => setCrateSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-500 text-gray-900"
                        autoFocus
                      />
                      {crateSearchQuery && (
                        <button
                          onClick={() => setCrateSearchQuery("")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {loadingCrates ? (
                        <div className="py-6 text-center text-sm text-gray-500">Loading crates...</div>
                      ) : (editingRequestId ? allActiveCrates : cratesInStorage).length === 0 ? (
                        <div className="py-6 text-center text-sm text-gray-500">No active crates available</div>
                      ) : (editingRequestId ? allActiveCrates : cratesInStorage)
                        .filter(crate => {
                          const searchLower = crateSearchQuery.toLowerCase();
                          const barcode = (crate.barcode || `Crate ${crate.id}`).toLowerCase();
                          const unitCode = (crate.unit?.unit_code || '').toLowerCase();
                          const storageLocation = crate.storage ?
                            `${crate.storage.room_name || ''} ${crate.storage.rack_name || ''} ${crate.storage.compartment_name || ''} ${crate.storage.shelf_name || ''}`.toLowerCase() : '';
                          return barcode.includes(searchLower) || unitCode.includes(searchLower) || storageLocation.includes(searchLower);
                        })
                        .map((crate) => (
                        <div
                          key={crate.id}
                          onClick={() => {
                            setSelectedCrate(String(crate.id));
                            setCrateSearchOpen(false);
                            setCrateSearchQuery("");
                          }}
                          className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedCrate === String(crate.id) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col items-start flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{crate.barcode || `Crate ${crate.id}`}</span>
                              {crate.unit && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{crate.unit.unit_code}</span>
                              )}
                            </div>
                            {crate.storage && (
                              <div className="text-xs text-gray-500">
                                {crate.storage.room_name} → {crate.storage.rack_name} → {crate.storage.compartment_name}{crate.storage.shelf_name ? ` → ${crate.storage.shelf_name}` : ''}
                              </div>
                            )}
                            {context?.crateId === String(crate.id) && (
                              <div className="text-xs text-blue-600">(From Barcode)</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {context?.crateId &&
                  selectedCrate === context.crateId && (
                    <div className="text-xs text-blue-600">
                      ✓ Crate pre-selected from barcode scan
                    </div>
                  )}
                {editingRequestId && (
                  <p className="text-xs text-orange-600">
                    ℹ Editing mode: All active crates shown (including those without storage)
                  </p>
                )}
                {!editingRequestId && !loadingCrates && cratesInStorage.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {cratesInStorage.length} crate{cratesInStorage.length !== 1 ? 's' : ''} from all your units available for withdrawal
                  </p>
                )}
              </div>

              {selectedCrate && (
                <>
                  <div className="space-y-2">
                    <Label>Select Documents</Label>
                    <div className="border rounded-md p-4 space-y-2">
                      {(() => {
                        // Find the original storage request for this crate
                        const storageRequest = allRequests.find((req: any) =>
                          req.request_type === 'Storage' &&
                          req.crate === parseInt(selectedCrate)
                        );
                        const documents = storageRequest?.request_documents || [];

                        if (documents.length === 0) {
                          return <p className="text-sm text-gray-500">No documents found for this crate</p>;
                        }

                        return documents.map((doc: any, index: number) => (
                          <div
                            key={doc.id || index}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={`doc-${doc.id || index}`}
                              checked={selectedDocuments.includes(
                                String(doc.id || index),
                              )}
                              onChange={() =>
                                handleDocumentSelection(String(doc.id || index))
                              }
                              className="rounded border-gray-300"
                              disabled={isFullWithdrawal}
                            />
                            <Label
                              htmlFor={`doc-${doc.id || index}`}
                              className="text-sm cursor-pointer"
                            >
                              {doc.document_name || doc.name || `Document ${index + 1}`} ({doc.document_type || doc.type || 'N/A'})
                            </Label>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <Checkbox
                      id="fullWithdrawal"
                      checked={isFullWithdrawal}
                      onCheckedChange={(checked) => {
                        setIsFullWithdrawal(checked as boolean);
                        if (checked) {
                          // Select all documents when full withdrawal is checked
                          const crateRequest = allRequests.find((req: any) => req.crate === parseInt(selectedCrate));
                          const allDocIds =
                            crateRequest?.request_documents?.map(
                              (doc: any, index: number) => String(doc.id || index),
                            ) || [];
                          setSelectedDocuments(allDocIds);
                        } else {
                          // Clear selection when unchecked
                          setSelectedDocuments([]);
                        }
                      }}
                    />
                    <Label
                      htmlFor="fullWithdrawal"
                      className="text-sm "
                    >
                      <strong>Full Withdrawal</strong> -
                      Withdraw entire crate with all documents
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Proposed Return Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Purpose</Label>
                      <Input placeholder="Reason for withdrawal" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {requestType === "destruction" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Crate for Destruction</Label>
                <Popover open={crateSearchOpen} onOpenChange={setCrateSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={crateSearchOpen}
                      className="w-full justify-between h-auto min-h-10"
                      disabled={loadingCrates}
                    >
                      {selectedCrate ? (
                        <div className="flex flex-col items-start text-left">
                          <div className="font-mono text-sm">
                            {(editingRequestId ? allActiveCrates : cratesInStorage).find(c => String(c.id) === selectedCrate)?.barcode || `Crate ${selectedCrate}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {loadingCrates ? "Loading crates..." : (editingRequestId ? allActiveCrates : cratesInStorage).length === 0 ? "No crates available" : "Search and select a crate for destruction..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-white border-2" align="start">
                    <div className="flex items-center gap-2 border-b-2 border-gray-300 px-3 py-3 bg-gray-50">
                      <Search className="h-5 w-5 text-cyan-600" />
                      <input
                        type="text"
                        placeholder="Type to search crates..."
                        value={crateSearchQuery}
                        onChange={(e) => setCrateSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-500 text-gray-900"
                        autoFocus
                      />
                      {crateSearchQuery && (
                        <button
                          onClick={() => setCrateSearchQuery("")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {loadingCrates ? (
                        <div className="py-6 text-center text-sm text-gray-500">Loading crates...</div>
                      ) : (() => {
                        // Filter crates: only show crates due for destruction this month or earlier
                        const now = new Date();
                        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        const eligibleCrates = (editingRequestId ? allActiveCrates : cratesInStorage)
                          .filter(crate => {
                            // Only include crates with destruction date <= end of current month
                            if (!crate.destruction_date) return false;
                            const destructionDate = new Date(crate.destruction_date);
                            return destructionDate <= endOfCurrentMonth;
                          });

                        return eligibleCrates.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-500">No crates due for destruction this month or earlier</div>
                        ) : eligibleCrates
                          .filter(crate => {
                            // Search query filter
                            const searchLower = crateSearchQuery.toLowerCase();
                            const barcode = (crate.barcode || `Crate ${crate.id}`).toLowerCase();
                            const unitCode = (crate.unit?.unit_code || '').toLowerCase();
                            const storageLocation = crate.storage ?
                              `${crate.storage.room_name || ''} ${crate.storage.rack_name || ''} ${crate.storage.compartment_name || ''} ${crate.storage.shelf_name || ''}`.toLowerCase() : '';
                            return barcode.includes(searchLower) || unitCode.includes(searchLower) || storageLocation.includes(searchLower);
                          })
                          .map((crate) => (
                          <div
                            key={crate.id}
                            onClick={() => {
                              setSelectedCrate(String(crate.id));
                              setCrateSearchOpen(false);
                              setCrateSearchQuery("");
                            }}
                            className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCrate === String(crate.id) ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col items-start flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{crate.barcode || `Crate ${crate.id}`}</span>
                                {crate.unit && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{crate.unit.unit_code}</span>
                                )}
                              </div>
                              <div className="text-xs text-cyan-600">Destruction Due: {crate.destruction_date ? new Date(crate.destruction_date).toLocaleDateString() : 'N/A'}</div>
                              {crate.storage && (
                                <div className="text-xs text-gray-500">
                                  {crate.storage.room_name} → {crate.storage.rack_name} → {crate.storage.compartment_name}{crate.storage.shelf_name ? ` → ${crate.storage.shelf_name}` : ''}
                                </div>
                              )}
                              {context?.crateId === String(crate.id) && (
                                <div className="text-xs text-blue-600">(From Barcode)</div>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </PopoverContent>
                </Popover>
                {editingRequestId && (
                  <p className="text-xs text-orange-600">
                    ℹ Editing mode: All active crates shown (including those without storage)
                  </p>
                )}
                {context?.crateId &&
                  selectedCrate === context.crateId && (
                    <div className="text-xs text-blue-600">
                      ✓ Crate pre-selected from barcode scan
                    </div>
                  )}
                {!loadingCrates && cratesInStorage.length > 0 && (() => {
                  const now = new Date();
                  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                  const eligibleCount = cratesInStorage.filter(crate =>
                    crate.destruction_date && new Date(crate.destruction_date) <= endOfCurrentMonth
                  ).length;
                  return eligibleCount > 0 ? (
                    <p className="text-xs text-gray-500">
                      {eligibleCount} crate{eligibleCount !== 1 ? 's' : ''} due for destruction this month or earlier
                    </p>
                  ) : null;
                })()}
              </div>

              {selectedCrate && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <h4 className="font-medium mb-2">
                    Crate Details
                  </h4>
                  <p className="text-sm text-gray-600">
                    Destruction Date:{" "}
                    {
                      cratesInStorage.find(
                        (c) => String(c.id) === selectedCrate,
                      )?.destruction_date
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    Documents:{" "}
                    {(() => {
                      const storageRequest = allRequests.find((req: any) =>
                        req.request_type === 'Storage' &&
                        req.crate === parseInt(selectedCrate)
                      );
                      return storageRequest?.request_documents?.length || 0;
                    })()}{" "}
                    documents
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason for Destruction</Label>
                <Textarea placeholder="Enter reason for destruction request" />
              </div>
            </div>
          )}

          {requestType && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRequestType("");
                  setSelectedUnit("");
                  setSelectedDepartment("");
                  setSelectedSection("");
                  setDestructionDate("");
                  setGeneratedCrateId("");
                  setSelectedCrate("");
                  setSelectedDocuments([]);
                  setDocuments([{ name: "", type: "" }]);
                  setToCentral(false);
                  setToBeRetained(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-900 hover:bg-blue-800"
                onClick={() => {
                  // Validate fields before opening signature modal
                  if (requestType === "new-crate") {
                    // Only require destruction date if "To Be Retained" is not checked
                    if (!toBeRetained && !destructionDate) {
                      toast.error('Please fill in the Destruction Date');
                      return;
                    }

                    const validDocuments = documents.filter((d: { name: string; type: string }) => d.name && d.type);
                    if (validDocuments.length === 0) {
                      toast.error('Please add at least one document');
                      return;
                    }
                  } else if (requestType === "withdrawal" || requestType === "destruction") {
                    if (!selectedCrate) {
                      toast.error('Please select a crate');
                      return;
                    }
                  }

                  // Open digital signature modal
                  const isEditing = editingRequestId !== null;
                  setSignatureModal({
                    isOpen: true,
                    action: `${isEditing ? 'Update & Resubmit' : 'Submit'} ${requestType === "new-crate" ? "Storage" : requestType === "withdrawal" ? "Withdrawal" : "Destruction"} Request`,
                    onConfirm: async (password: string) => {
                      setIsSignatureLoading(true);
                      setSignatureError(null);

                      try {
                        if (requestType === "new-crate") {
                          const validDocuments = documents.filter((d: { name: string; type: string }) => d.name && d.type);
                          // Convert month (YYYY-MM) to 1st of that month (YYYY-MM-01), or null if retained
                          const destructionDateFormatted = toBeRetained ? null : (destructionDate ? `${destructionDate}-01` : '');

                          if (isEditing) {
                            // Update existing request
                            await updateStorageRequest.mutateAsync({
                              request_id: editingRequestId,
                              destruction_date: destructionDateFormatted,
                              purpose: '',
                              to_central: toCentral,
                              to_be_retained: toBeRetained,
                              documents: validDocuments.map((d: { name: string; type: string }) => ({
                                document_name: d.name,
                                document_number: d.name,
                                document_type: (d.type === 'Physical' || d.type === 'Digital') ? d.type : 'Physical'
                              })),
                              digital_signature: password
                            });
                            toast.success("Storage request updated and resubmitted successfully!");
                          } else {
                            // Create new request
                            await createStorageRequest.mutateAsync({
                              unit: parseInt(selectedUnit),
                              department: parseInt(selectedDepartment),
                              section: selectedSection ? parseInt(selectedSection) : null,
                              destruction_date: destructionDateFormatted,
                              purpose: '',
                              to_central: toCentral,
                              to_be_retained: toBeRetained,
                              documents: validDocuments.map((d: { name: string; type: string }) => ({
                                document_name: d.name,
                                document_number: d.name,
                                document_type: (d.type === 'Physical' || d.type === 'Digital') ? d.type : 'Physical'
                              })),
                              digital_signature: password
                            });
                            toast.success("Storage request submitted successfully!");
                          }
                        } else if (requestType === "withdrawal") {
                          const expectedReturnDate = new Date();
                          expectedReturnDate.setDate(expectedReturnDate.getDate() + 7);

                          if (isEditing) {
                            // Update existing request
                            await updateWithdrawalRequest.mutateAsync({
                              request_id: editingRequestId,
                              expected_return_date: expectedReturnDate.toISOString(),
                              purpose: '',
                              full_withdrawal: isFullWithdrawal,
                              document_ids: isFullWithdrawal ? undefined : selectedDocuments.map((d: string) => parseInt(d)),
                              digital_signature: password
                            });
                            toast.success("Withdrawal request updated and resubmitted successfully!");
                          } else {
                            // Create new request
                            await createWithdrawalRequest.mutateAsync({
                              crate_id: parseInt(selectedCrate),
                              expected_return_date: expectedReturnDate.toISOString(),
                              purpose: '',
                              full_withdrawal: isFullWithdrawal,
                              document_ids: isFullWithdrawal ? undefined : selectedDocuments.map((d: string) => parseInt(d)),
                              digital_signature: password
                            });
                            toast.success("Withdrawal request submitted successfully!");
                          }
                        } else if (requestType === "destruction") {
                          if (isEditing) {
                            // Update existing request
                            await updateDestructionRequest.mutateAsync({
                              request_id: editingRequestId,
                              purpose: '',
                              digital_signature: password
                            });
                            toast.success("Destruction request updated and resubmitted successfully!");
                          } else {
                            // Create new request
                            await createDestructionRequest.mutateAsync({
                              crate_id: parseInt(selectedCrate),
                              digital_signature: password
                            });
                            toast.success("Destruction request submitted successfully!");
                          }
                        }

                        // Refetch requests to update the list
                        await refetchRequests();

                        // Clear form and editing state
                        setRequestType("");
                        setSelectedUnit("");
                        setSelectedDepartment("");
                        setSelectedSection("");
                        setDestructionDate("");
                        setGeneratedCrateId("");
                        setSelectedCrate("");
                        setSelectedDocuments([]);
                        setDocuments([{ name: "", type: "" }]);
                        setIsFullWithdrawal(false);
                        setEditingRequestId(null);
                        setEditedRequestData(null);
                        setToCentral(false);
                        setToBeRetained(false);

                        // Close modal on success
                        setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
                      } catch (error: any) {
                        console.error('Error submitting request:', error);
                        const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
                        setSignatureError(errorMessage);
                      } finally {
                        setIsSignatureLoading(false);
                      }
                    }
                  });
                }}
              >
                {editingRequestId ? 'Update & Resubmit Request' : 'Submit Request'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Requests Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl text-gray-900">Active Requests</h3>
          <p className="text-sm text-gray-600">
            Track your requests and their current stage in the workflow
          </p>
        </div>

        {/* Sent Back Requests - Editable */}
        {sentBackRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <ArrowLeft className="h-5 w-5" />
                    Requests Sent Back for Modifications
                  </CardTitle>
                  <p className="text-sm text-orange-700 mt-1">
                    These requests need modifications before resubmission
                  </p>
                </div>
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  {sentBackRequests.length} {sentBackRequests.length === 1 ? 'Request' : 'Requests'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sentBackRequests.map((request) => (
                <Card key={request.id} className="border-orange-200">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">REQ-{request.id}</span>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800">
                              {request.request_type}
                            </Badge>
                            <Badge className="bg-orange-500 text-white">Sent Back</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Crate ID: <span className="font-mono">{request.crate_info?.barcode || request.crate_info?.id || 'N/A'}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested on: {new Date(request.request_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Display sendback reason */}
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <p className="text-sm font-medium text-orange-900 mb-1">
                          Modifications Required:
                        </p>
                        <p className="text-sm text-orange-800">
                          {request.sendback_reason || 'Changes requested by approver'}
                        </p>
                      </div>

                      {/* Edit Button */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => {
                            setEditingRequestId(request.id);
                            setEditedRequestData(request);
                            // Pre-fill form fields based on request type
                            setRequestType(
                              request.request_type === 'Storage' ? 'new-crate' :
                              request.request_type === 'Withdrawal' ? 'withdrawal' :
                              'destruction'
                            );
                            if (request.request_type === 'Storage') {
                              setSelectedUnit(request.unit?.toString() || '');
                              setDestructionDate(request.crate_info?.destruction_date || '');
                            } else {
                              setSelectedCrate(request.crate?.toString() || '');
                            }
                            toast('Scroll up to edit the request details', { icon: '✏️' });
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit & Resubmit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this request?')) {
                              handleReject(request.id);
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="min-w-[120px]">
                    Request ID
                  </TableHead>
                  <TableHead className="min-w-[100px]">Type</TableHead>
                  <TableHead className="min-w-[140px]">
                    Crate ID
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    Requested By
                  </TableHead>
                  <TableHead className="min-w-[180px]">Unit</TableHead>
                  <TableHead className="min-w-[140px]">
                    Date & Time
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    Current Stage
                  </TableHead>
                  <TableHead className="min-w-[250px]">
                    Stage Detail
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    Progress
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {console.log(activeRequests)}
                {activeRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-gray-500"
                    >
                      No active requests
                    </TableCell>
                  </TableRow>
                ) : (
                  activeRequests.map((request) => {
                    // Calculate progress based on status
                    const progress =
                      request.status === 'Pending' ? 25 :
                      request.status === 'Approved' ? 50 :
                      request.status === 'Issued' ? 75 : 100;

                    // Get stage detail
                    const stageDetail =
                      request.status === 'Pending' ? 'Awaiting QC Head approval' :
                      request.status === 'Approved' ? 'Awaiting storage allocation' :
                      request.status === 'Issued' ? 'Ready for document retrieval' :
                      'Completed';

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          REQ-{request.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {request.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {request.crate_info?.barcode || request.crate_info?.id || 'N/A'}
                        </TableCell>
                        <TableCell>{request.withdrawn_by_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {request.unit_code || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(request.request_date).toLocaleDateString()} {new Date(request.request_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </TableCell>
                        <TableCell>
                          {request.status === "Pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800 whitespace-nowrap">
                              Pending Approval
                            </Badge>
                          )}
                          {request.status === "Approved" && (
                            <Badge className="bg-blue-100 text-blue-800 whitespace-nowrap">
                              Approved
                            </Badge>
                          )}
                          {request.status === "Issued" && (
                            <Badge className="bg-cyan-100 text-cyan-800 whitespace-nowrap">
                              Issued
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {stageDetail}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  progress === 25
                                    ? "bg-yellow-500"
                                    : progress === 50
                                    ? "bg-blue-500"
                                    : progress === 75
                                    ? "bg-cyan-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderApprovalQueue = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">
          Approval Queue
        </h2>
        {/* <p className="text-gray-600">
          QC Head / Approver View - Pending requests requiring
          approval
        </p> */}
      </div>

      {/* Sent Back Requests - For Section Heads to monitor and cancel if needed */}
      {sentBackRequests.length > 0 && (
        <Card>
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5 text-orange-600" />
                  Requests Sent Back for Modifications
                </CardTitle>
                <CardDescription className="text-sm text-orange-700 mt-1">
                  These requests are waiting for the requester to make modifications. You can cancel them if needed.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {sentBackRequests.length} {sentBackRequests.length === 1 ? 'Request' : 'Requests'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Request ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Crate ID</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentBackRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        REQ-{request.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.crate_info?.barcode || request.crate_info?.id || request.crate || 'N/A'}
                      </TableCell>
                      <TableCell>{request.withdrawn_by_name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(request.request_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-orange-700 truncate" title={request.sendback_reason || 'No reason provided'}>
                          {request.sendback_reason || 'No reason provided'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleRequestExpansion(request.id.toString())
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to cancel request REQ-${request.id}? This action cannot be undone.`)) {
                                handleReject(request.id);
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRequests.includes(String(request.id)) && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="bg-orange-50 p-6"
                        >
                          <div className="space-y-4">
                            <div className="bg-orange-100 border border-orange-200 rounded-md p-4">
                              <h5 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Reason for Sending Back:
                              </h5>
                              <p className="text-sm text-orange-800">
                                {request.sendback_reason || 'No reason provided'}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Request ID:</span>
                                  <span className="font-medium">REQ-{request.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <Badge variant="outline">{request.request_type}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Requested By:</span>
                                  <span className="font-medium">{request.withdrawn_by_name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Unit:</span>
                                  <span className="font-medium">{request.unit_code || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Crate ID:</span>
                                  <span className="font-mono font-medium">{request.crate_info?.barcode || request.crate_info?.id || request.crate || 'N/A'}</span>
                                </div>
                                {request.crate_info?.destruction_date && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Destruction Date:</span>
                                    <span className="font-medium">
                                      {new Date(request.crate_info.destruction_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {request.crate_info?.status && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Crate Status:</span>
                                    <Badge variant="outline">{request.crate_info.status}</Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            {request.request_documents && request.request_documents.length > 0 && (
                              <div className="bg-white rounded-lg p-4">
                                <h5 className="font-medium text-gray-900 text-sm mb-3">Documents:</h5>
                                <div className="space-y-2">
                                  {request.request_documents.map((doc: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                      <span>{doc.document?.document_name || 'N/A'}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {doc.document?.document_type || 'N/A'}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Crate ID</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No pending requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        REQ-{request.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.crate_info?.barcode || request.crate_info?.id || request.crate || 'N/A'}
                      </TableCell>
                      <TableCell>{request.withdrawn_by_name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(request.request_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleRequestExpansion(request.id.toString())
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                          onClick={() => handleSendBack(request.id)}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Send Back
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to reject this request? This action cannot be undone.')) {
                              handleReject(request.id);
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRequests.includes(String(request.id)) && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="bg-gray-50 p-6"
                      >
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Detailed Request Information
                            </h4>
                          </div>

                          {/* General Request Info */}
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Request Details</h5>
                              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Request ID:</span>
                                  <span className="font-medium">REQ-{request.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <Badge variant="outline">{request.request_type}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Requested By:</span>
                                  <span className="font-medium">{request.withdrawn_by_name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Unit:</span>
                                  <span className="font-medium">{request.unit_code || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Request Date:</span>
                                  <span className="font-medium">
                                    {new Date(request.request_date).toLocaleDateString()} {new Date(request.request_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                  </span>
                                </div>
                                {request.purpose && (
                                  <div className="flex flex-col gap-1 pt-2 border-t">
                                    <span className="text-gray-600">Purpose:</span>
                                    <span className="font-medium text-gray-900">{request.purpose}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Crate Information */}
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Crate Information</h5>
                              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Crate ID:</span>
                                  <span className="font-mono font-medium">{request.crate_info?.barcode || request.crate_info?.id || request.crate || 'N/A'}</span>
                                </div>
                                {request.crate_info?.destruction_date && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Destruction Date:</span>
                                    <span className="font-medium">
                                      {new Date(request.crate_info.destruction_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {request.crate_info?.creation_date && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Crate Created:</span>
                                    <span className="font-medium">
                                      {new Date(request.crate_info.creation_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {request.crate_info?.status && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Crate Status:</span>
                                    <Badge variant={request.crate_info.status === 'Active' ? 'default' : 'secondary'}>
                                      {request.crate_info.status}
                                    </Badge>
                                  </div>
                                )}
                                {request.storage_location && (
                                  <div className="flex flex-col gap-1 pt-2 border-t">
                                    <span className="text-gray-600">Current Storage Location:</span>
                                    <span className="font-medium text-blue-600">{request.storage_location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Request Type Specific Information */}
                          {request.request_type === "Storage" && (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">
                                Documents to be Stored ({request.request_documents?.length || 0})
                              </h5>
                              <div className="bg-white rounded-lg p-4">
                                {request.request_documents && request.request_documents.length > 0 ? (
                                  <div className="space-y-3">
                                    {request.request_documents.map((docItem: any, idx: number) => (
                                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <FileText className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-gray-900">
                                            {docItem.document?.document_name || docItem.name || 'Unnamed Document'}
                                          </p>
                                          <p className="text-sm text-gray-600 font-mono">
                                            {docItem.document?.document_number || docItem.number || 'No Document Number'}
                                          </p>
                                          {docItem.document?.document_type && (
                                            <Badge variant="outline" className="mt-1">
                                              {docItem.document.document_type}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 text-center py-4">No documents listed</p>
                                )}
                              </div>
                            </div>
                          )}

                          {request.request_type === "Withdrawal" && (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Withdrawal Details</h5>
                              <div className="bg-white rounded-lg p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Withdrawal Type:</span>
                                  <Badge variant={request.full_withdrawal ? "default" : "secondary"}>
                                    {request.full_withdrawal ? "Full Withdrawal" : "Partial Withdrawal"}
                                  </Badge>
                                </div>
                                {request.expected_return_date && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Expected Return Date:</span>
                                    <span className="font-medium">
                                      {new Date(request.expected_return_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {request.request_documents && request.request_documents.length > 0 && (
                                  <div className="pt-3 border-t">
                                    <p className="text-sm text-gray-600 mb-2">Documents to Withdraw:</p>
                                    <div className="space-y-2">
                                      {request.request_documents.map((docItem: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                          <span className="font-medium">{docItem.document?.document_name || docItem.name || 'Unknown'}</span>
                                          <span className="text-gray-500 font-mono text-xs">
                                            ({docItem.document?.document_number || docItem.number || 'N/A'})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {request.request_type === "Destruction" && (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Destruction Details</h5>
                              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Scheduled Destruction Date:</span>
                                  <span className="font-medium">
                                    {request.crate_info?.destruction_date
                                      ? new Date(request.crate_info.destruction_date).toLocaleDateString()
                                      : 'Not Set'}
                                  </span>
                                </div>
                                {request.crate_info?.destruction_date &&
                                  new Date(request.crate_info.destruction_date) < new Date() && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-red-800 text-sm font-medium">
                                      ⚠️ This crate has passed its destruction date
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderStoreHeadQueue = (filterType?: "Storage" | "Withdrawal") => {
    const filteredRequests = filterType
      ? approvedRequests.filter(r => r.request_type === filterType)
      : approvedRequests;

    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">
          Storage Allocation
        </h2>
        {/* <p className="text-gray-600">
          Approved requests awaiting storage allocation
        </p> */}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Request ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Crate ID</TableHead>
                <TableHead>Storage Location</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No approved requests awaiting storage allocation
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        REQ-{request.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.request_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {request.crate_info?.barcode || request.crate_info?.id || request.crate || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.storage_location ? (
                          <span className="font-medium text-blue-600">
                            {request.storage_location}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not allocated</span>
                        )}
                      </TableCell>
                      <TableCell>{request.withdrawn_by_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleRequestExpansion(request.id.toString())
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.request_type === "Storage" && request.status === "Approved" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Allocate
                          </Button>
                        )}
                        {request.request_type === "Withdrawal" && request.status === "Approved" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSignatureModal({
                                isOpen: true,
                                action: 'Issue Documents',
                                onConfirm: async (password: string) => {
                                  setIsSignatureLoading(true);
                                  setSignatureError(null);
                                  try {
                                    await issueDocuments.mutateAsync({
                                      request_id: request.id,
                                      digital_signature: password
                                    });
                                    toast.success('Documents issued successfully');
                                    await refetchRequests();
                                    setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
                                  } catch (error: any) {
                                    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
                                    setSignatureError(errorMessage);
                                  } finally {
                                    setIsSignatureLoading(false);
                                  }
                                }
                              });
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Issue Crate
                          </Button>
                        )}
                        {request.request_type === "Withdrawal" && request.status === "Issued" && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => toggleRequestExpansion(request.id.toString())}
                          >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Return
                          </Button>
                        )}
                        {request.request_type === "Destruction" && (
                          <Button
                            size="sm"
                            className="bg-gray-600 hover:bg-gray-700"
                          >
                            Execute
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRequests.includes(String(request.id)) && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="bg-gray-50 p-4"
                      >
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900 mb-4">
                            Request Details
                          </h4>

                          {/* Request Details Section */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white rounded-lg p-4 space-y-2 text-sm border border-gray-200">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Request ID:</span>
                                <span className="font-medium">REQ-{request.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <Badge variant="outline">{request.request_type}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Requested By:</span>
                                <span className="font-medium">{request.withdrawn_by_name || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Unit:</span>
                                <span className="font-medium">{request.unit_code || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Request Date:</span>
                                <span className="font-medium">
                                  {new Date(request.request_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 space-y-2 text-sm border border-gray-200">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Crate ID:</span>
                                <span className="font-mono font-medium">{(request.crate_info as any)?.barcode || request.crate_info?.id || request.crate || 'N/A'}</span>
                              </div>
                              {request.crate_info?.storage_location && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Current Location:</span>
                                  <span className="font-medium text-blue-600">{request.crate_info.storage_location}</span>
                                </div>
                              )}
                              {request.crate_info?.status && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Crate Status:</span>
                                  <Badge variant="outline">{request.crate_info.status}</Badge>
                                </div>
                              )}
                              {request.request_type === "Withdrawal" && request.full_withdrawal !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Withdrawal Type:</span>
                                  <Badge variant="outline">{request.full_withdrawal ? 'Full' : 'Partial'}</Badge>
                                </div>
                              )}
                              {request.expected_return_date && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Expected Return:</span>
                                  <span className="font-medium">
                                    {new Date(request.expected_return_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {request.purpose && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                              <h5 className="font-semibold text-blue-900 mb-2">Purpose:</h5>
                              <p className="text-sm text-blue-800">{request.purpose}</p>
                            </div>
                          )}

                          {/* Show requested documents for withdrawal requests */}
                          {request.request_type === "Withdrawal" && request.documents && request.documents.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                              <h5 className="font-semibold text-green-900 mb-3">Requested Documents:</h5>
                              <div className="space-y-2">
                                {request.documents.map((doc, index) => (
                                  <div key={index} className="bg-white rounded p-3 border border-green-100">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{doc.document_name}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          <span className="font-mono">{doc.document_number}</span>
                                          {doc.document_type && (
                                            <Badge variant="outline" className="ml-2 text-xs">
                                              {doc.document_type}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {request.full_withdrawal && (
                                <div className="mt-3 text-sm text-green-700 font-medium">
                                  ⚠️ Full Withdrawal - All documents in this crate will be issued
                                </div>
                              )}
                            </div>
                          )}

                          <h4 className="font-medium text-gray-900 mt-6 mb-4">
                            Store Head Action Required:
                          </h4>

                          {request.request_type === "Storage" && (
                            <div className="space-y-4">
                              <h5 className="font-medium text-sm">
                                Assign Storage Location:
                              </h5>
                              <div className="grid grid-cols-5 gap-4">
                                <div>
                                  <Label className="text-sm">
                                    Unit {units.length > 0 && <span className="text-xs text-gray-500">({units.length} accessible)</span>}
                                  </Label>
                                  <Select
                                    value={selectedUnit}
                                    onValueChange={(value) => {
                                      setSelectedUnit(value);
                                      setSelectedRoom('');
                                      setSelectedRack('');
                                      setSelectedCompartment('');
                                      setSelectedShelf('');
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={units.length === 0 ? "No units accessible" : "Select your unit"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {units.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">No accessible units</div>
                                      ) : (
                                        units.map((unit) => (
                                          <SelectItem
                                            key={unit.id}
                                            value={unit.id.toString()}
                                          >
                                            {unit.unit_code} {unit.unit_name ? `- ${unit.unit_name}` : ''}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm">
                                    Room
                                  </Label>
                                  <Select
                                    value={selectedRoom}
                                    onValueChange={(value) => {
                                      setSelectedRoom(value);
                                      setSelectedRack('');
                                      setSelectedCompartment('');
                                      setSelectedShelf('');
                                    }}
                                    disabled={!selectedUnit || loadingStorage || availableRooms.length === 0}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={!selectedUnit ? "Select unit first" : loadingStorage ? "Loading..." : availableRooms.length === 0 ? "No rooms available" : "Select room"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRooms.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">{!selectedUnit ? "Please select a unit first" : "No storage locations found for this unit"}</div>
                                      ) : (
                                        availableRooms.map((room) => (
                                          <SelectItem
                                            key={room}
                                            value={room}
                                          >
                                            {room}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm">
                                    Storage Location (Rack, Compartment{hasShelfLevel ? ', Shelf' : ''})
                                  </Label>
                                  <Popover open={storageSearchOpen} onOpenChange={setStorageSearchOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={storageSearchOpen}
                                        className="w-full justify-between h-auto min-h-10"
                                        disabled={!selectedRoom || loadingStorage}
                                      >
                                        {currentStorageSelection ? (
                                          <div className="flex items-center gap-2 text-left">
                                            <span className="font-mono font-bold text-base bg-gray-100 px-2 py-0.5 rounded">
                                              {currentStorageSelection.compactCode}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {currentStorageSelection.rack} / {currentStorageSelection.compartment}{hasShelfLevel && currentStorageSelection.shelf ? ` / ${currentStorageSelection.shelf}` : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            {!selectedRoom ? "Select room first" : loadingStorage ? "Loading..." : combinedStorageLocations.length === 0 ? "No storage locations available" : "Search and select storage location..."}
                                          </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 bg-white border-2" align="start">
                                      <div className="flex items-center gap-2 border-b-2 border-gray-300 px-3 py-3 bg-gray-50">
                                        <Search className="h-5 w-5 text-green-600" />
                                        <input
                                          type="text"
                                          placeholder="Search by code (e.g., 1A1) or name..."
                                          value={storageSearchQuery}
                                          onChange={(e) => setStorageSearchQuery(e.target.value)}
                                          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-500 text-gray-900"
                                          autoFocus
                                        />
                                        {storageSearchQuery && (
                                          <button
                                            onClick={() => setStorageSearchQuery("")}
                                            className="text-gray-400 hover:text-gray-600"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto p-1">
                                        {loadingStorage ? (
                                          <div className="py-6 text-center text-sm text-gray-500">Loading storage locations...</div>
                                        ) : combinedStorageLocations.length === 0 ? (
                                          <div className="py-6 text-center text-sm text-gray-500">No storage locations available</div>
                                        ) : (() => {
                                            const filtered = combinedStorageLocations.filter(storage => {
                                              const searchLower = storageSearchQuery.toLowerCase();
                                              return storage.searchText.includes(searchLower);
                                            });
                                            const limitedResults = filtered.slice(0, 100);
                                            const hasMore = filtered.length > 100;

                                            return (
                                              <>
                                                {limitedResults.length === 0 ? (
                                                  <div className="py-6 text-center text-sm text-gray-500">No matching storage locations found</div>
                                                ) : (
                                                  <>
                                                    {limitedResults.map((storage, index) => (
                                                      <div
                                                        key={index}
                                                        onClick={() => {
                                                          setSelectedRack(storage.rack);
                                                          setSelectedCompartment(storage.compartment);
                                                          setSelectedShelf(storage.shelf || '');
                                                          setStorageSearchOpen(false);
                                                          setStorageSearchQuery("");
                                                        }}
                                                        className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                                                      >
                                                        <Check
                                                          className={`mr-2 h-4 w-4 ${
                                                            currentStorageSelection &&
                                                            currentStorageSelection.rack === storage.rack &&
                                                            currentStorageSelection.compartment === storage.compartment &&
                                                            currentStorageSelection.shelf === storage.shelf
                                                              ? "opacity-100"
                                                              : "opacity-0"
                                                          }`}
                                                        />
                                                        <div className="flex items-center gap-3 flex-1">
                                                          <span className="font-mono font-bold text-base bg-gray-100 px-2 py-0.5 rounded">
                                                            {storage.compactCode}
                                                          </span>
                                                          <span className="text-xs text-gray-500">
                                                            {storage.rack} / {storage.compartment}{hasShelfLevel && storage.shelf ? ` / ${storage.shelf}` : ''}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    ))}
                                                    {hasMore && (
                                                      <div className="p-2 text-center text-xs text-orange-600 bg-orange-50 border-t">
                                                        Showing first 100 of {filtered.length} results. Type to narrow down.
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                              </>
                                            );
                                          })()}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {!hasShelfLevel && currentStorageSelection && (
                                    <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2">
                                      <p className="text-xs text-blue-800">
                                        3-level storage (no shelf required)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleAllocateStorage(request.id)}
                              >
                                Allocate Storage
                              </Button>
                            </div>
                          )}

                          {request.request_type === "Withdrawal" && request.status === "Issued" && (
                            <div className="space-y-4">
                              <h5 className="font-medium text-sm">
                                Assign Return Storage Location:
                              </h5>
                              <div className="grid grid-cols-5 gap-4">
                                <div>
                                  <Label className="text-sm">
                                    Unit {units.length > 0 && <span className="text-xs text-gray-500">({units.length} accessible)</span>}
                                  </Label>
                                  <Select
                                    value={selectedUnit}
                                    onValueChange={(value) => {
                                      setSelectedUnit(value);
                                      setSelectedRoom('');
                                      setSelectedRack('');
                                      setSelectedCompartment('');
                                      setSelectedShelf('');
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={units.length === 0 ? "No units accessible" : "Select your unit"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {units.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">No accessible units</div>
                                      ) : (
                                        units.map((unit) => (
                                          <SelectItem
                                            key={unit.id}
                                            value={unit.id.toString()}
                                          >
                                            {unit.unit_code} {unit.unit_name ? `- ${unit.unit_name}` : ''}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm">
                                    Room
                                  </Label>
                                  <Select
                                    value={selectedRoom}
                                    onValueChange={(value) => {
                                      setSelectedRoom(value);
                                      setSelectedRack('');
                                      setSelectedCompartment('');
                                      setSelectedShelf('');
                                    }}
                                    disabled={!selectedUnit || loadingStorage || availableRooms.length === 0}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={!selectedUnit ? "Select unit first" : loadingStorage ? "Loading..." : availableRooms.length === 0 ? "No rooms available" : "Select room"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRooms.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500">{!selectedUnit ? "Please select a unit first" : "No storage locations found for this unit"}</div>
                                      ) : (
                                        availableRooms.map((room) => (
                                          <SelectItem
                                            key={room}
                                            value={room}
                                          >
                                            {room}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm">
                                    Storage Location (Rack, Compartment{hasShelfLevel ? ', Shelf' : ''})
                                  </Label>
                                  <Popover open={storageSearchOpen} onOpenChange={setStorageSearchOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={storageSearchOpen}
                                        className="w-full justify-between h-auto min-h-10"
                                        disabled={!selectedRoom || loadingStorage}
                                      >
                                        {currentStorageSelection ? (
                                          <div className="flex items-center gap-2 text-left">
                                            <span className="font-mono font-bold text-base bg-gray-100 px-2 py-0.5 rounded">
                                              {currentStorageSelection.compactCode}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {currentStorageSelection.rack} / {currentStorageSelection.compartment}{hasShelfLevel && currentStorageSelection.shelf ? ` / ${currentStorageSelection.shelf}` : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            {!selectedRoom ? "Select room first" : loadingStorage ? "Loading..." : combinedStorageLocations.length === 0 ? "No storage locations available" : "Search and select storage location..."}
                                          </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 bg-white border-2" align="start">
                                      <div className="flex items-center gap-2 border-b-2 border-gray-300 px-3 py-3 bg-gray-50">
                                        <Search className="h-5 w-5 text-green-600" />
                                        <input
                                          type="text"
                                          placeholder="Search by code (e.g., 1A1) or name..."
                                          value={storageSearchQuery}
                                          onChange={(e) => setStorageSearchQuery(e.target.value)}
                                          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-gray-500 text-gray-900"
                                          autoFocus
                                        />
                                        {storageSearchQuery && (
                                          <button
                                            onClick={() => setStorageSearchQuery("")}
                                            className="text-gray-400 hover:text-gray-600"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                      <div className="max-h-[300px] overflow-y-auto p-1">
                                        {loadingStorage ? (
                                          <div className="py-6 text-center text-sm text-gray-500">Loading storage locations...</div>
                                        ) : combinedStorageLocations.length === 0 ? (
                                          <div className="py-6 text-center text-sm text-gray-500">No storage locations available</div>
                                        ) : (() => {
                                            const filtered = combinedStorageLocations.filter(storage => {
                                              const searchLower = storageSearchQuery.toLowerCase();
                                              return storage.searchText.includes(searchLower);
                                            });
                                            const limitedResults = filtered.slice(0, 100);
                                            const hasMore = filtered.length > 100;

                                            return (
                                              <>
                                                {limitedResults.length === 0 ? (
                                                  <div className="py-6 text-center text-sm text-gray-500">No matching storage locations found</div>
                                                ) : (
                                                  <>
                                                    {limitedResults.map((storage, index) => (
                                                      <div
                                                        key={index}
                                                        onClick={() => {
                                                          setSelectedRack(storage.rack);
                                                          setSelectedCompartment(storage.compartment);
                                                          setSelectedShelf(storage.shelf || '');
                                                          setStorageSearchOpen(false);
                                                          setStorageSearchQuery("");
                                                        }}
                                                        className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                                                      >
                                                        <Check
                                                          className={`mr-2 h-4 w-4 ${
                                                            currentStorageSelection &&
                                                            currentStorageSelection.rack === storage.rack &&
                                                            currentStorageSelection.compartment === storage.compartment &&
                                                            currentStorageSelection.shelf === storage.shelf
                                                              ? "opacity-100"
                                                              : "opacity-0"
                                                          }`}
                                                        />
                                                        <div className="flex items-center gap-3 flex-1">
                                                          <span className="font-mono font-bold text-base bg-gray-100 px-2 py-0.5 rounded">
                                                            {storage.compactCode}
                                                          </span>
                                                          <span className="text-xs text-gray-500">
                                                            {storage.rack} / {storage.compartment}{hasShelfLevel && storage.shelf ? ` / ${storage.shelf}` : ''}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    ))}
                                                    {hasMore && (
                                                      <div className="p-2 text-center text-xs text-orange-600 bg-orange-50 border-t">
                                                        Showing first 100 of {filtered.length} results. Type to narrow down.
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                              </>
                                            );
                                          })()}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {!hasShelfLevel && currentStorageSelection && (
                                    <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2">
                                      <p className="text-xs text-blue-800">
                                        3-level storage (no shelf required)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => handleReturnDocuments(request.id)}
                              >
                                Return & Allocate Storage
                              </Button>
                            </div>
                          )}

                          {request.request_type === "Destruction" && (
                            <div className="space-y-2">
                              <p className="text-sm">
                                Location: Archive Store - Room
                                15 - Rack D - Compartment 01 -
                                Shelf 05
                              </p>
                              <p className="text-sm">
                                Documents to Destroy: 4
                                documents
                              </p>
                              <Button className="bg-gray-600 hover:bg-gray-700">
                                Execute Destruction
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    );
  };

  // Render allocation tab - showing only Storage requests
  const renderAllocationQueue = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">
          Allocation - New Crates
        </h2>
      </div>
      {renderStoreHeadQueue("Storage").props.children[1]}
    </div>
  );

  // Render withdrawal tab - showing only Withdrawal requests
  const renderWithdrawalQueue = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">
          Withdrawal
        </h2>
      </div>
      {renderStoreHeadQueue("Withdrawal").props.children[1]}
    </div>
  );

  const renderRearrangement = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-gray-900">
          Crate Rearrangement
        </h2>
        {/* <p className="text-gray-600">
          Change crate storage locations - Store Head only
        </p> */}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Crate ID</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Current Location</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userUnitCrates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No crates in storage for your unit
                  </TableCell>
                </TableRow>
              ) : (
                userUnitCrates.map((crate) => (
                  <React.Fragment key={crate.id}>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        {crate.barcode || crate.id}
                      </TableCell>
                      <TableCell>{crate.unit.unit_code}</TableCell>
                      <TableCell className="text-sm">
                        {crate.storage
                          ? `${crate.storage.room_name} - ${crate.storage.rack_name} - ${crate.storage.compartment_name}${crate.storage.shelf_name ? ` - ${crate.storage.shelf_name}` : ''}`
                          : 'Not allocated'}
                      </TableCell>
                      <TableCell>
                        {allRequests.find((req: any) => req.crate === crate.id)?.request_documents?.length || 0} documents
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleRequestExpansion(String(crate.id))
                            }
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            Relocate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  {expandedRequests.includes(String(crate.id)) && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="bg-gray-50 p-4"
                      >
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">
                            Assign New Location:
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            <div>
                              <Label className="text-sm">
                                Unit
                              </Label>
                              <Select
                                value={relocationUnit}
                                onValueChange={(value) => {
                                  setRelocationUnit(value);
                                  setRelocationRoom('');
                                  setRelocationRack('');
                                  setRelocationCompartment('');
                                  setRelocationShelf('');
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {units.map((unit) => (
                                    <SelectItem
                                      key={unit.id}
                                      value={unit.id.toString()}
                                    >
                                      {unit.unit_code} {unit.unit_name ? `- ${unit.unit_name}` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm">
                                Room
                              </Label>
                              <Select
                                value={relocationRoom}
                                onValueChange={(value) => {
                                  setRelocationRoom(value);
                                  setRelocationRack('');
                                  setRelocationCompartment('');
                                  setRelocationShelf('');
                                }}
                                disabled={!relocationUnit || relocationAvailableRooms.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={!relocationUnit ? "Select unit first" : relocationAvailableRooms.length === 0 ? "No rooms" : "Select Room"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {relocationAvailableRooms.map((room) => (
                                    <SelectItem
                                      key={room}
                                      value={room}
                                    >
                                      {room}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm">
                                Rack
                              </Label>
                              <Select
                                value={relocationRack}
                                onValueChange={(value) => {
                                  setRelocationRack(value);
                                  setRelocationCompartment('');
                                  setRelocationShelf('');
                                }}
                                disabled={!relocationRoom || relocationAvailableRacks.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={!relocationRoom ? "Select room first" : relocationAvailableRacks.length === 0 ? "No racks" : "Select Rack"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {relocationAvailableRacks.map((rack) => (
                                    <SelectItem
                                      key={rack}
                                      value={rack}
                                    >
                                      {rack}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm">
                                Compartment
                              </Label>
                              <Select
                                value={relocationCompartment}
                                onValueChange={(value) => {
                                  setRelocationCompartment(value);
                                  setRelocationShelf('');
                                }}
                                disabled={!relocationRack || relocationAvailableCompartments.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={!relocationRack ? "Select rack first" : relocationAvailableCompartments.length === 0 ? "No compartments" : "Select Compartment"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {relocationAvailableCompartments.map((comp) => (
                                    <SelectItem
                                      key={comp}
                                      value={comp}
                                    >
                                      {comp}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {relocationHasShelfLevel && (
                              <div>
                                <Label className="text-sm">
                                  Shelf
                                </Label>
                                <Select
                                  value={relocationShelf}
                                  onValueChange={setRelocationShelf}
                                  disabled={!relocationCompartment || relocationAvailableShelves.length === 0}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={!relocationCompartment ? "Select compartment first" : relocationAvailableShelves.length === 0 ? "No shelves" : "Select Shelf"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {relocationAvailableShelves.map((shelf) => (
                                      <SelectItem
                                        key={shelf}
                                        value={shelf || ''}
                                      >
                                        {shelf}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleRelocateCrate(crate.id)}
                              disabled={relocateCrate.isPending}
                            >
                              {relocateCrate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Confirm Relocation
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                toggleRequestExpansion(String(crate.id));
                                setRelocationUnit('');
                                setRelocationRoom('');
                                setRelocationRack('');
                                setRelocationCompartment('');
                                setRelocationShelf('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Build tabs array based on user permissions
  const tabs = [
    // New Request tab - Only visible to Users
    ...(permissions.canCreateStorageRequest ? [{
      id: "new-request",
      label: "New Request",
      icon: Plus,
    }] : []),
    // Approval tab - Only visible to Section Heads
    ...(permissions.canApproveRequests ? [{
      id: "approval",
      label: "Approval",
      icon: CheckCircle,
    }] : []),
    // Storage Allocation tab - Only visible to Store Heads
    ...(permissions.canAllocateStorage ? [{
      id: "allocation",
      label: "Allocation",
      icon: MapPin,
    }] : []),
    // Withdrawal tab - Only visible to Store Heads
    ...(permissions.canAllocateStorage ? [{
      id: "withdrawal",
      label: "Withdrawal",
      icon: PackageOpen,
    }] : []),
    // Rearrangement tab - Only visible to Store Heads
    ...(permissions.canRelocateCrate ? [{
      id: "rearrangement",
      label: "Rearrangement",
      icon: ArrowRightLeft,
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">Transaction</h1>
        {/* <p className="text-gray-600">
          Manage crate requests, approvals, and storage
          operations
        </p> */}
      </div>

      {/* Transaction Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className={`grid w-full ${
          tabs.length === 1 ? 'grid-cols-1' :
          tabs.length === 2 ? 'grid-cols-2' :
          tabs.length === 3 ? 'grid-cols-3' :
          tabs.length === 4 ? 'grid-cols-4' :
          'grid-cols-5'
        } bg-white border border-gray-200`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {tab.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          {/* Only render tab content if user has permission */}
          {permissions.canCreateStorageRequest && (
            <TabsContent value="new-request" className="m-0">
              {renderNewRequestForm()}
            </TabsContent>
          )}
          {permissions.canApproveRequests && (
            <TabsContent value="approval" className="m-0">
              {renderApprovalQueue()}
            </TabsContent>
          )}
          {permissions.canAllocateStorage && (
            <TabsContent value="allocation" className="m-0">
              {renderAllocationQueue()}
            </TabsContent>
          )}
          {permissions.canAllocateStorage && (
            <TabsContent value="withdrawal" className="m-0">
              {renderWithdrawalQueue()}
            </TabsContent>
          )}
          {permissions.canRelocateCrate && (
            <TabsContent value="rearrangement" className="m-0">
              {renderRearrangement()}
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={signatureModal.isOpen}
        onClose={() => {
          setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
          setSignatureError(null);
          setIsSignatureLoading(false);
        }}
        onConfirm={signatureModal.onConfirm}
        action={signatureModal.action}
        isLoading={isSignatureLoading}
        error={signatureError}
      />
    </div>
  );
}