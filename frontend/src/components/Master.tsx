import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Building2,
  MapPin,
  Plus,
  Edit,
  Users,
  FolderTree,
  Loader2,
  Shield,
} from "lucide-react";
import {
  useUnits,
  useDepartments,
  useSections,
  useCreateUnit,
  useCreateDepartment,
  useCreateSection,
  useUpdateUnit,
  useUpdateDepartment,
  useUpdateSection,
} from '../hooks/useMaster';
import {
  useStorage,
  useBulkCreateStorage,
  useDeleteStorage,
} from '../hooks/useStorage';
import { RoleManagement } from './RoleManagement';

export function Master() {
  // State management (must be before hooks that depend on state)
  const [activeSubTab, setActiveSubTab] = useState("units");
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isEditDepartmentOpen, setIsEditDepartmentOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [isBulkCreateStorageOpen, setIsBulkCreateStorageOpen] = useState(false);
  const [selectedUnitForStorage, setSelectedUnitForStorage] = useState<number | null>(null);

  // API Hooks
  const { data: unitsData, isLoading: loadingUnits } = useUnits();
  const { data: departmentsData, isLoading: loadingDepartments } = useDepartments();
  const { data: sectionsData, isLoading: loadingSections } = useSections();
  const { data: storageData, isLoading: loadingStorage } = useStorage(selectedUnitForStorage || undefined);

  // Mutations
  const createUnitMutation = useCreateUnit();
  const updateUnitMutation = useUpdateUnit();
  const createDepartmentMutation = useCreateDepartment();
  const updateDepartmentMutation = useUpdateDepartment();
  const createSectionMutation = useCreateSection();
  const updateSectionMutation = useUpdateSection();
  const bulkCreateStorageMutation = useBulkCreateStorage();
  const deleteStorageMutation = useDeleteStorage();

  // Extract data
  const units = unitsData?.results || [];
  const departments = departmentsData?.results || [];
  const sections = sectionsData?.results || [];
  const storageLocations = storageData?.results || [];

  // Form states for Unit
  const [newUnit, setNewUnit] = useState({
    unit_code: '',
    unit_name: '',
  });

  // Form states for Department
  const [newDepartment, setNewDepartment] = useState({
    department_name: '',
    unit: '' as string,
  });

  // Form states for Section
  const [newSection, setNewSection] = useState({
    section_name: '',
    unit: '' as string,
    department: '' as string,
  });

  // Form states for Bulk Storage Creation
  const [bulkStorageForm, setBulkStorageForm] = useState({
    unit_id: '',
    room_numbers: '',
    racks_per_room: '20',
    compartments_per_rack: '20',
    shelves_per_compartment: '',
    has_shelves: false,
    alphabetical_rack: false,
    alphabetical_compartment: false,
    alphabetical_shelf: false,
  });

  // Loading state
  if (loadingUnits || loadingDepartments || loadingSections) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const subTabs = [
    { id: "units", label: "Units", icon: Building2 },
    { id: "departments", label: "Departments", icon: Users },
    { id: "sections", label: "Sections", icon: FolderTree },
    { id: "storage", label: "Storage", icon: MapPin },
  ];

  // Handler for creating a unit
  const handleCreateUnit = async () => {
    if (!newUnit.unit_code) {
      toast.error('Please enter a unit code');
      return;
    }

    try {
      await createUnitMutation.mutateAsync(newUnit);
      setIsAddUnitOpen(false);
      setNewUnit({ unit_code: '', unit_name: '' });
      toast.success('Unit created successfully!');
    } catch (error: any) {
      toast.error('Failed to create unit: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for editing a unit
  const handleEditUnit = (unit: any) => {
    setSelectedUnit({
      id: unit.id,
      unit_code: unit.unit_code,
      unit_name: unit.unit_name || '',
    });
    setIsEditUnitOpen(true);
  };

  // Handler for updating a unit
  const handleUpdateUnit = async () => {
    if (!selectedUnit?.unit_code) {
      toast.error('Please enter a unit code');
      return;
    }

    try {
      await updateUnitMutation.mutateAsync({
        id: selectedUnit.id,
        unit_code: selectedUnit.unit_code,
        unit_name: selectedUnit.unit_name,
      });
      setIsEditUnitOpen(false);
      setSelectedUnit(null);
      toast.success('Unit updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update unit: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for creating a department
  const handleCreateDepartment = async () => {
    if (!newDepartment.department_name || !newDepartment.unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createDepartmentMutation.mutateAsync({
        department_name: newDepartment.department_name,
        unit_id: parseInt(newDepartment.unit),
      });
      setIsAddDepartmentOpen(false);
      setNewDepartment({ department_name: '', unit: '' });
      toast.success('Department created successfully!');
    } catch (error: any) {
      toast.error('Failed to create department: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for editing a department
  const handleEditDepartment = (dept: any) => {
    setSelectedDepartment({
      id: dept.id,
      department_name: dept.department_name,
      unit_id: dept.unit.id.toString(),
    });
    setIsEditDepartmentOpen(true);
  };

  // Handler for updating a department
  const handleUpdateDepartment = async () => {
    if (!selectedDepartment?.department_name || !selectedDepartment?.unit_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateDepartmentMutation.mutateAsync({
        id: selectedDepartment.id,
        department_name: selectedDepartment.department_name,
        unit_id: parseInt(selectedDepartment.unit_id),
      } as any);
      setIsEditDepartmentOpen(false);
      setSelectedDepartment(null);
      toast.success('Department updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update department: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for creating a section
  const handleCreateSection = async () => {
    if (!newSection.section_name || !newSection.unit || !newSection.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createSectionMutation.mutateAsync({
        section_name: newSection.section_name,
        department_id: parseInt(newSection.department),
      });
      setIsAddSectionOpen(false);
      setNewSection({ section_name: '', unit: '', department: '' });
      toast.success('Section created successfully!');
    } catch (error: any) {
      toast.error('Failed to create section: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for editing a section
  const handleEditSection = (section: any) => {
    setSelectedSection({
      id: section.id,
      section_name: section.section_name,
      department_id: section.department.id.toString(),
    });
    setIsEditSectionOpen(true);
  };

  // Handler for updating a section
  const handleUpdateSection = async () => {
    if (!selectedSection?.section_name || !selectedSection?.department_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateSectionMutation.mutateAsync({
        id: selectedSection.id,
        section_name: selectedSection.section_name,
        department_id: parseInt(selectedSection.department_id),
      } as any);
      setIsEditSectionOpen(false);
      setSelectedSection(null);
      toast.success('Section updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update section: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handler for bulk creating storage
  const handleBulkCreateStorage = async () => {
    if (!bulkStorageForm.unit_id || !bulkStorageForm.room_numbers || !bulkStorageForm.racks_per_room || !bulkStorageForm.compartments_per_rack) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate shelves if has_shelves is checked
    if (bulkStorageForm.has_shelves && !bulkStorageForm.shelves_per_compartment) {
      toast.error('Please specify shelves per compartment');
      return;
    }

    // Parse room numbers (comma-separated)
    const roomNumbers = bulkStorageForm.room_numbers
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    if (roomNumbers.length === 0) {
      toast.error('Please enter at least one room number');
      return;
    }

    try {
      const payload: any = {
        unit_id: parseInt(bulkStorageForm.unit_id),
        room_numbers: roomNumbers,
        racks_per_room: parseInt(bulkStorageForm.racks_per_room),
        compartments_per_rack: parseInt(bulkStorageForm.compartments_per_rack),
        alphabetical_rack: bulkStorageForm.alphabetical_rack,
        alphabetical_compartment: bulkStorageForm.alphabetical_compartment,
      };

      if (bulkStorageForm.has_shelves && bulkStorageForm.shelves_per_compartment) {
        payload.shelves_per_compartment = parseInt(bulkStorageForm.shelves_per_compartment);
        payload.alphabetical_shelf = bulkStorageForm.alphabetical_shelf;
      }

      const result = await bulkCreateStorageMutation.mutateAsync(payload);
      setIsBulkCreateStorageOpen(false);
      setBulkStorageForm({
        unit_id: '',
        room_numbers: '',
        racks_per_room: '20',
        compartments_per_rack: '20',
        shelves_per_compartment: '',
        has_shelves: false,
        alphabetical_rack: false,
        alphabetical_compartment: false,
        alphabetical_shelf: false,
      });
      toast(`Successfully created ${result.count} storage locations!`);
    } catch (error: any) {
      toast.error('Failed to create storage: ' + (error.response?.data?.error || error.message));
    }
  };

  // Calculate total storage locations
  const calculateTotalLocations = () => {
    const roomNumbers = bulkStorageForm.room_numbers
      .split(',')
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);
    const rooms = roomNumbers.length;
    const racks = parseInt(bulkStorageForm.racks_per_room) || 0;
    const compartments = parseInt(bulkStorageForm.compartments_per_rack) || 0;
    const shelves = bulkStorageForm.has_shelves ? (parseInt(bulkStorageForm.shelves_per_compartment) || 0) : 1;

    if (bulkStorageForm.has_shelves && shelves === 0) return 0;
    return rooms * racks * compartments * shelves;
  };

  const renderUnitsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">
            Unit Management
          </h2>
        </div>
        <Dialog
          open={isAddUnitOpen}
          onOpenChange={setIsAddUnitOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Unit Code *</Label>
                <Input
                  placeholder="Enter unit code (e.g., HR, QC)"
                  value={newUnit.unit_code}
                  onChange={(e) => setNewUnit({ ...newUnit, unit_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Name</Label>
                <Input
                  placeholder="Enter unit name (optional)"
                  value={newUnit.unit_name}
                  onChange={(e) => setNewUnit({ ...newUnit, unit_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddUnitOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleCreateUnit}
                  disabled={createUnitMutation.isPending}
                >
                  {createUnitMutation.isPending ? 'Creating...' : 'Create Unit'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Unit Code</TableHead>
                <TableHead>Unit Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    No units found. Create your first unit!
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {unit.unit_code}
                    </TableCell>
                    <TableCell>
                      {unit.unit_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUnit(unit)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Unit Dialog */}
      <Dialog open={isEditUnitOpen} onOpenChange={setIsEditUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update unit information</DialogDescription>
          </DialogHeader>
          {selectedUnit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Unit Code *</Label>
                <Input
                  placeholder="Enter unit code (e.g., HR, QC)"
                  value={selectedUnit.unit_code}
                  onChange={(e) => setSelectedUnit({ ...selectedUnit, unit_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Name</Label>
                <Input
                  placeholder="Enter unit name (optional)"
                  value={selectedUnit.unit_name}
                  onChange={(e) => setSelectedUnit({ ...selectedUnit, unit_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditUnitOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleUpdateUnit}
                  disabled={updateUnitMutation.isPending}
                >
                  {updateUnitMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderDepartmentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">
            Department Management
          </h2>
        </div>
        <Dialog
          open={isAddDepartmentOpen}
          onOpenChange={setIsAddDepartmentOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select
                  value={newDepartment.unit}
                  onValueChange={(value) => setNewDepartment({ ...newDepartment, unit: value })}
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
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input
                  placeholder="Enter department name"
                  value={newDepartment.department_name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, department_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDepartmentOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleCreateDepartment}
                  disabled={createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending ? 'Creating...' : 'Create Department'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Department Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Department Head</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No departments found. Create your first department!
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">
                      {dept.department_name}
                    </TableCell>
                    <TableCell>
                      {dept.unit.unit_code}
                    </TableCell>
                    <TableCell>
                      {dept.department_head?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditDepartment(dept)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDepartmentOpen} onOpenChange={setIsEditDepartmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select
                  value={selectedDepartment.unit_id}
                  onValueChange={(value) => setSelectedDepartment({ ...selectedDepartment, unit_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Unit" />
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
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input
                  placeholder="Enter department name"
                  value={selectedDepartment.department_name}
                  onChange={(e) => setSelectedDepartment({ ...selectedDepartment, department_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDepartmentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleUpdateDepartment}
                  disabled={updateDepartmentMutation.isPending}
                >
                  {updateDepartmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderSectionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">
            Section Management
          </h2>
        </div>
        <Dialog
          open={isAddSectionOpen}
          onOpenChange={setIsAddSectionOpen}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select
                  value={newSection.unit}
                  onValueChange={(value) => setNewSection({ ...newSection, unit: value, department: '' })}
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
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={newSection.department}
                  onValueChange={(value) => setNewSection({ ...newSection, department: value })}
                  disabled={!newSection.unit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newSection.unit ? "Select Department" : "Select Unit first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter((dept) => dept.unit.id.toString() === newSection.unit)
                      .map((dept) => (
                        <SelectItem
                          key={dept.id}
                          value={dept.id.toString()}
                        >
                          {dept.department_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section Name *</Label>
                <Input
                  placeholder="Enter section name"
                  value={newSection.section_name}
                  onChange={(e) => setNewSection({ ...newSection, section_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddSectionOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleCreateSection}
                  disabled={createSectionMutation.isPending}
                >
                  {createSectionMutation.isPending ? 'Creating...' : 'Create Section'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Section Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No sections found. Create your first section!
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">
                      {section.section_name}
                    </TableCell>
                    <TableCell>{section.department.department_name}</TableCell>
                    <TableCell>{section.department.unit.unit_code}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditSection(section)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Section Dialog */}
      <Dialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>Update section information</DialogDescription>
          </DialogHeader>
          {selectedSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={selectedSection.department_id}
                  onValueChange={(value) => setSelectedSection({ ...selectedSection, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.department_name} ({dept.unit.unit_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section Name *</Label>
                <Input
                  placeholder="Enter section name"
                  value={selectedSection.section_name}
                  onChange={(e) => setSelectedSection({ ...selectedSection, section_name: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditSectionOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-900 hover:bg-blue-800"
                  onClick={handleUpdateSection}
                  disabled={updateSectionMutation.isPending}
                >
                  {updateSectionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderStorageTab = () => {
    // Storage is now filtered by the backend via the useStorage(selectedUnitForStorage) hook
    const filteredStorage = storageLocations;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">Storage Management</h2>
          </div>
          <Dialog
            open={isBulkCreateStorageOpen}
            onOpenChange={setIsBulkCreateStorageOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-900 hover:bg-blue-800">
                <Plus className="h-4 w-4 mr-2" />
                Bulk Create Storage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Create Storage Locations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Select
                    value={bulkStorageForm.unit_id}
                    onValueChange={(value) =>
                      setBulkStorageForm({ ...bulkStorageForm, unit_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Unit" />
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

                <div className="space-y-2">
                  <Label>Room Numbers *</Label>
                  <Input
                    type="text"
                    placeholder="e.g., 101, 102, 201, 202"
                    value={bulkStorageForm.room_numbers}
                    onChange={(e) =>
                      setBulkStorageForm({
                        ...bulkStorageForm,
                        room_numbers: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Enter room numbers separated by commas (e.g., 101, 102, 201)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Racks per Room *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 20"
                      value={bulkStorageForm.racks_per_room}
                      onChange={(e) =>
                        setBulkStorageForm({
                          ...bulkStorageForm,
                          racks_per_room: e.target.value,
                        })
                      }
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="alphabetical_rack"
                        checked={bulkStorageForm.alphabetical_rack}
                        onChange={(e) =>
                          setBulkStorageForm({
                            ...bulkStorageForm,
                            alphabetical_rack: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="alphabetical_rack" className="cursor-pointer text-sm">
                        Alphabetical (A, B, C...)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Compartments per Rack *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 20"
                    value={bulkStorageForm.compartments_per_rack}
                    onChange={(e) =>
                      setBulkStorageForm({
                        ...bulkStorageForm,
                        compartments_per_rack: e.target.value,
                      })
                    }
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <input
                      type="checkbox"
                      id="alphabetical_compartment"
                      checked={bulkStorageForm.alphabetical_compartment}
                      onChange={(e) =>
                        setBulkStorageForm({
                          ...bulkStorageForm,
                          alphabetical_compartment: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="alphabetical_compartment" className="cursor-pointer text-sm">
                      Alphabetical (A, B, C...)
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="has_shelves"
                      checked={bulkStorageForm.has_shelves}
                      onChange={(e) =>
                        setBulkStorageForm({
                          ...bulkStorageForm,
                          has_shelves: e.target.checked,
                          shelves_per_compartment: e.target.checked
                            ? bulkStorageForm.shelves_per_compartment
                            : '',
                        })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="has_shelves" className="cursor-pointer">
                      Include Shelves (4-level storage)
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Uncheck for 3-level storage (Room → Rack → Compartment only)
                  </p>
                </div>

                {bulkStorageForm.has_shelves && (
                  <div className="space-y-2">
                    <Label>Shelves per Compartment *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g., 4"
                      value={bulkStorageForm.shelves_per_compartment}
                      onChange={(e) =>
                        setBulkStorageForm({
                          ...bulkStorageForm,
                          shelves_per_compartment: e.target.value,
                        })
                      }
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="alphabetical_shelf"
                        checked={bulkStorageForm.alphabetical_shelf}
                        onChange={(e) =>
                          setBulkStorageForm({
                            ...bulkStorageForm,
                            alphabetical_shelf: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="alphabetical_shelf" className="cursor-pointer text-sm">
                        Alphabetical (A, B, C...)
                      </Label>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Total Storage Locations: {calculateTotalLocations()}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {bulkStorageForm.room_numbers.split(',').filter((r: string) => r.trim()).length || 0} room(s) × {bulkStorageForm.racks_per_room || 0} rack(s) × {bulkStorageForm.compartments_per_rack || 0} compartment(s)
                    {bulkStorageForm.has_shelves && ` × ${bulkStorageForm.shelves_per_compartment || 0} shelf/shelves`}
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkCreateStorageOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-900 hover:bg-blue-800"
                    onClick={handleBulkCreateStorage}
                    disabled={bulkCreateStorageMutation.isPending}
                  >
                    {bulkCreateStorageMutation.isPending
                      ? 'Creating...'
                      : `Create ${calculateTotalLocations()} Locations`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Unit Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Label className="whitespace-nowrap">Filter by Unit:</Label>
              <Select
                value={selectedUnitForStorage?.toString() || 'all'}
                onValueChange={(value) =>
                  setSelectedUnitForStorage(value === 'all' ? null : parseInt(value))
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.unit_code} {unit.unit_name ? `- ${unit.unit_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredStorage.length} location(s)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Storage Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Unit</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Compartment</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Full Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStorage ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredStorage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No storage locations found. Create storage using the bulk create feature!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStorage.slice(0, 100).map((storage) => (
                    <TableRow key={storage.id}>
                      <TableCell className="font-medium">{storage.unit_code}</TableCell>
                      <TableCell>{storage.room_name}</TableCell>
                      <TableCell>{storage.rack_name}</TableCell>
                      <TableCell>{storage.compartment_name}</TableCell>
                      <TableCell>{storage.shelf_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {storage.full_location}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredStorage.length > 100 && (
              <div className="p-4 text-center text-sm text-gray-500 border-t">
                Showing first 100 of {filteredStorage.length} locations
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">
          Master Configuration
        </h1>
        {/* <p className="text-gray-600"> */}
          System configuration and setup management
        {/* </p> */}
      </div>

      {/* Sub-tabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="units" className="m-0">
            {renderUnitsTab()}
          </TabsContent>
          <TabsContent value="departments" className="m-0">
            {renderDepartmentsTab()}
          </TabsContent>
          <TabsContent value="sections" className="m-0">
            {renderSectionsTab()}
          </TabsContent>
          <TabsContent value="storage" className="m-0">
            {renderStorageTab()}
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
