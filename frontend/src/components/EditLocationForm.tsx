import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Save, MapPin, Clock, DollarSign, Building, Globe, Phone } from 'lucide-react';
import { LocationData } from '../services/api';

interface EditLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: LocationData) => void;
  initialCoordinates?: { lat: number; lng: number };
}

interface FormData {
  title: string;
  content: string;
  type: string;
  address: string;
  phone: string;
  website: string;
  openingHours: string;
  closingHours: string;
  admissionFee: string;
  enshrined_deities: string;
  founded_year: string;
  latitude: string;
  longitude: string;
}

const EditLocationForm: React.FC<EditLocationFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCoordinates
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    type: 'Shrine',
    address: '',
    phone: '',
    website: '',
    openingHours: '',
    closingHours: '',
    admissionFee: 'Free',
    enshrined_deities: '',
    founded_year: '',
    latitude: initialCoordinates?.lat.toString() || '',
    longitude: initialCoordinates?.lng.toString() || ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter location name';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Please enter location description';
    }
    
    if (!formData.latitude || isNaN(Number(formData.latitude))) {
      newErrors.latitude = 'Please enter valid latitude';
    }
    
    if (!formData.longitude || isNaN(Number(formData.longitude))) {
      newErrors.longitude = 'Please enter valid longitude';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear corresponding field error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Process deity data
    const deities = formData.enshrined_deities
      .split(',')
      .map(deity => deity.trim())
      .filter(deity => deity)
      .map(deity => {
        const parts = deity.split('-').map(part => part.trim());
        return {
          name: parts[0],
          role: parts[1] || ''
        };
      });

    // Create new location data
    const newLocation: LocationData = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: formData.title,
      content: formData.content,
      coordinates: {
        lat: Number(formData.latitude),
        lng: Number(formData.longitude)
      },
      metadata: {
        type: formData.type,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        gate_open: formData.openingHours || undefined,
        gate_close: formData.closingHours || undefined,
        admission_fee: formData.admissionFee === 'Free' ? 0 : 
                       formData.admissionFee ? Number(formData.admissionFee) : undefined,
        enshrined_deities: deities.length > 0 ? deities : undefined,
        founded_year: formData.founded_year || undefined,
        // Default facility information
        wheelchair_access: false,
        wifi: false,
        toilets: false
      }
    };

    onSave(newLocation);
    onClose();
    
    // Reset form
    setFormData({
      title: '',
      content: '',
      type: 'Shrine',
      address: '',
      phone: '',
      website: '',
      openingHours: '',
      closingHours: '',
      admissionFee: 'Free',
      enshrined_deities: '',
      founded_year: '',
      latitude: '',
      longitude: ''
    });
    setErrors({});
  }, [formData, validateForm, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Add Location Information</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Takasu Hakusan Shrine"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Shrine">Shrine</option>
                  <option value="Temple">Temple</option>
                  <option value="Attraction">Attraction</option>
                  <option value="Museum">Museum</option>
                  <option value="Park">Park</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please enter detailed description of the location, including historical background, features, etc..."
              />
              {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 63-6 Takasu-cho, Fukui-shi, Fukui-ken"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.latitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="36.113666"
                />
                {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.longitude ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="136.105612"
                />
                {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 0776-XX-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Opening Hours and Fees */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Opening Hours and Fees
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={formData.openingHours}
                  onChange={(e) => handleInputChange('openingHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={formData.closingHours}
                  onChange={(e) => handleInputChange('closingHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Fee
                </label>
                <input
                  type="text"
                  value={formData.admissionFee}
                  onChange={(e) => handleInputChange('admissionFee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Free or 500"
                />
              </div>
            </div>
          </div>

          {/* Special Information (Shrine/Temple only) */}
          {(formData.type === 'Shrine' || formData.type === 'Temple') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">
                ⛩️ Religious Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enshrined Deities (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.enshrined_deities}
                    onChange={(e) => handleInputChange('enshrined_deities', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Hakusan Daijin - Agriculture, Harvest, Health"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: Deity Name - Role, separate multiple deities with commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Founded Year
                  </label>
                  <input
                    type="text"
                    value={formData.founded_year}
                    onChange={(e) => handleInputChange('founded_year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Location
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditLocationForm;
