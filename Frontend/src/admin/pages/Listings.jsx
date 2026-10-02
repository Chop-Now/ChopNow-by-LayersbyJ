import React, { useState, useEffect } from 'react';
import { categories } from '../../assets/assets';
import {
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  X,
  Crop,
  Maximize2,
  ShoppingCart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminMode } from '../context/AdminModeContext';
import { useAppContext } from '../../context/AppContext';
import { listingService, businessService } from '../../services';
import toast from 'react-hot-toast';

// Map frontend category paths to backend enum values
// Backend accepts: 'fruit-veg', 'baked-goods', 'meals', 'dairy', 'meat', 'beverages', 'pantry', 'other'
const categoryMap = {
  // Frontend category paths from assets.js
  Vegetables: 'fruit-veg',
  Fruits: 'fruit-veg',
  Drinks: 'beverages',
  Instant: 'meals',
  Dairy: 'dairy',
  Bakery: 'baked-goods',
  Grains: 'pantry',
  Meat: 'meat',
  Meals: 'meals',
  Pantry: 'pantry',
  Other: 'other',
  // Direct mapping for already correct values (case-insensitive support)
  'fruit-veg': 'fruit-veg',
  'baked-goods': 'baked-goods',
  meals: 'meals',
  dairy: 'dairy',
  meat: 'meat',
  beverages: 'beverages',
  pantry: 'pantry',
  other: 'other',
};

export const AllListings = () => {
  const navigate = useNavigate();
  const { adminMode, isAdmin } = useAdminMode();
  const { user } = useAppContext();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const itemsPerPage = 10;

  // Fetch the user's business first
  useEffect(() => {
    let isMounted = true;
    const fetchBusiness = async () => {
      // In website admin mode, we don't need to fetch a specific business
      if (adminMode === 'website' && isAdmin) {
        if (isMounted) setBusinessId('admin'); // Flag for admin mode
        return;
      }

      try {
        const response = await businessService.getMyBusinesses();
        if (!isMounted) return;
        const businesses = response.businesses || response || [];
        if (businesses.length > 0) {
          setBusinessId(businesses[0]._id);
          setBusinessName(businesses[0].name || '');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching business:', error);
      }
    };
    fetchBusiness();
    return () => {
      isMounted = false;
    };
  }, [adminMode, isAdmin]);

  // Fetch products when businessId is available
  const fetchProducts = async () => {
    try {
      setIsLoading(true);

      // Admin website mode - fetch all listings (including inactive/expired)
      if (adminMode === 'website' && isAdmin) {
        const response = await listingService.getListings({ status: 'all' });
        const listings = response.listings || response || [];
        setProducts(Array.isArray(listings) ? listings : []);
        return;
      }

      // Vendor shop mode - fetch only their listings
      if (businessId && businessId !== 'admin') {
        const data = await listingService.getListingsByBusiness(businessId);
        const listings = data.listings || data || [];
        setProducts(Array.isArray(listings) ? listings : []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (businessId) {
      const loadProducts = async () => {
        try {
          setIsLoading(true);

          if (adminMode === 'website' && isAdmin) {
            const response = await listingService.getListings({ status: 'all' });
            if (!isMounted) return;
            const listings = response.listings || response || [];
            setProducts(Array.isArray(listings) ? listings : []);
            return;
          }

          if (businessId && businessId !== 'admin') {
            const data = await listingService.getListingsByBusiness(businessId);
            if (!isMounted) return;
            const listings = data.listings || data || [];
            setProducts(Array.isArray(listings) ? listings : []);
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('Error fetching listings:', error);
          toast.error('Failed to load listings');
          setProducts([]);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      loadProducts();
    }
    return () => {
      isMounted = false;
    };
  }, [businessId, adminMode]);

  // Toggle product status
  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await listingService.updateListing(productId, { status: newStatus });

      setProducts((prev) =>
        prev.map((product) =>
          product._id === productId ? { ...product, status: newStatus } : product
        )
      );
      toast.success(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await listingService.deleteListing(productId);
        setProducts((prev) => prev.filter((product) => product._id !== productId));
        toast.success('Listing deleted successfully');
      } catch (error) {
        toast.error('Failed to delete listing');
      }
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  // Calculate stats
  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    inactive: products.filter((p) => p.status === 'inactive').length,
    expired: products.filter((p) => p.status === 'expired').length,
  };

  // Filter products
  const filteredProducts = (Array.isArray(products) ? products : []).filter((product) => {
    const matchesSearch = (product?.name || product?.title || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const showingFrom = filteredProducts.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredProducts.length);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(currentProducts.map((p) => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Handle individual select
  const handleSelect = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((pId) => pId !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const statsCards = [
    {
      title: 'Total Listings',
      value: stats.total,
      icon: <Package className="w-6 h-6" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Active Listings',
      value: stats.active,
      icon: <CheckCircle className="w-6 h-6" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Inactive Listings',
      value: stats.inactive,
      icon: <XCircle className="w-6 h-6" />,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Expired Listings',
      value: stats.expired,
      icon: <Clock className="w-6 h-6" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  // If editing a product, show the edit form
  if (editingProduct) {
    return (
      <EditListing
        product={editingProduct}
        onBack={() => setEditingProduct(null)}
        onRefresh={fetchProducts}
      />
    );
  }

  // Loading state
  if (isLoading && !products.length) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading listings...</p>
        </div>
      </div>
    );
  }

  // No business found state (for vendors only, not admins)
  if (!businessId && adminMode === 'shop' && !isAdmin) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-8 max-w-md">
          <Package className="w-16 h-16 text-moringa-muted/70 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-moringa dark:text-white mb-2">No Business Found</h2>
          <p className="text-moringa-muted dark:text-slate-400 mb-4">
            You need to complete your business setup to manage listings.
          </p>
          <button
            onClick={() => navigate('/business-verification')}
            className="px-6 py-2 bg-solid hover:bg-tertiary text-white font-medium rounded-lg transition-colors"
          >
            Complete Business Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-medium text-moringa-muted dark:text-slate-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-moringa dark:text-white">{stat.value}</p>
              </div>
              <div
                className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-all duration-300`}
              >
                <div className={stat.iconColor}>{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-moringa-muted/70" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-xs text-moringa dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-moringa-muted dark:text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-xs text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              {selectedProducts.length} item{selectedProducts.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button className="px-3 py-1.5 bg-solid hover:bg-tertiary text-white rounded-lg text-xs font-medium transition-colors">
                Activate Selected
              </button>
              <button className="px-3 py-1.5 bg-solidOne hover:bg-solidTwo text-white rounded-lg text-xs font-medium transition-colors">
                Deactivate Selected
              </button>
              <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-hairline dark:border-slate-700/50">
          <h3 className="text-base font-bold text-moringa dark:text-white">All Products</h3>
          <p className="text-xs text-moringa-muted dark:text-slate-400">
            Manage your product listings
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-fufu dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedProducts.length === currentProducts.length &&
                      currentProducts.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-moringa/25 text-solid focus:ring-solid cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Pickup Window
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-semibold text-moringa-muted dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline dark:divide-slate-700">
              {currentProducts.map((product) => (
                <tr
                  key={product._id}
                  className="hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => handleSelect(product._id)}
                      className="w-4 h-4 rounded border-moringa/25 text-solid focus:ring-solid cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image?.[0] || product.images?.[0] || '/placeholder-food.jpg'}
                        alt={product.name || product.title || 'Product'}
                        className="w-10 h-10 rounded-lg object-cover border border-hairline dark:border-slate-700"
                      />
                      <span className="text-xs font-medium text-moringa dark:text-white truncate max-w-xs">
                        {product.name || product.title || 'Unnamed Product'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      {product.category || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-semibold text-moringa dark:text-white">
                      {product.stock || product.inventory?.quantity || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      {product.pickupTime || 'Flexible'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        product.status === 'active'
                          ? 'bg-solid/10 text-solid'
                          : product.status === 'inactive'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {product.status
                        ? product.status.charAt(0).toUpperCase() + product.status.slice(1)
                        : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={product.status === 'active'}
                          onChange={() => handleToggleStatus(product._id, product.status)}
                        />
                        <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-solid transition-colors duration-200"></div>
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                      </label>
                      {adminMode === 'shop' && (
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 hover:bg-fufu dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-moringa-muted dark:text-slate-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 border-t border-hairline dark:border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              Showing {showingFrom} to {showingTo} of {filteredProducts.length} listings
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-moringa-muted dark:text-slate-400 bg-white dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-lg hover:bg-fufu dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    currentPage === index + 1
                      ? 'bg-solid text-white'
                      : 'text-moringa-muted dark:text-slate-400 bg-white dark:bg-slate-800 border border-hairline dark:border-slate-700 hover:bg-fufu dark:hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-moringa-muted dark:text-slate-400 bg-white dark:bg-slate-800 border border-hairline dark:border-slate-700 rounded-lg hover:bg-fufu dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-moringa-muted dark:text-slate-400">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const NewListing = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    vendor: '', // Will be set from business name
    price: '',
    offerPrice: '',
    pickupFrom: '',
    pickupTo: '',
    stock: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    allergens: '',
    isRecurring: false,
    frequency: 'daily',
    repeatDays: [],
    endDate: '',
  });

  const [images, setImages] = useState([]);
  const [mainImage, setMainImage] = useState(null);

  // Fetch the user's business on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBusiness = async () => {
      try {
        setIsLoadingBusiness(true);
        const response = await businessService.getMyBusinesses();
        if (!isMounted) return;
        const businesses = response.businesses || response || [];
        if (businesses.length > 0) {
          setBusinessId(businesses[0]._id);
          setBusinessName(businesses[0].name || '');
          setFormData((prev) => ({ ...prev, vendor: businesses[0].name || '' }));
        } else {
          toast.error('No business found. Please create a business first.');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching business:', error);
        toast.error('Failed to load business information');
      } finally {
        if (isMounted) setIsLoadingBusiness(false);
      }
    };
    fetchBusiness();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(day)
        ? prev.repeatDays.filter((d) => d !== day)
        : [...prev.repeatDays, day],
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (!mainImage && newImages.length > 0) {
      setMainImage(newImages[0]);
    }
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (mainImage?.id === id) {
      const remaining = images.filter((img) => img.id !== id);
      setMainImage(remaining[0] || null);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error('Please enter a product name');
      return;
    }
    if (!formData.description) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!formData.stock || Number(formData.stock) < 0) {
      toast.error('Please enter stock quantity');
      return;
    }
    if (!businessId) {
      toast.error('No business found. Please create a business first.');
      return;
    }
    if (!formData.pickupFrom || !formData.pickupTo) {
      toast.error('Please set pickup window times');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create full Date objects for timeWindow
      const availableFrom = new Date(formData.pickupFrom);
      const availableUntil = new Date(formData.pickupTo);

      // Validate dates
      if (isNaN(availableFrom.getTime()) || isNaN(availableUntil.getTime())) {
        toast.error('Invalid pickup window dates');
        setIsSubmitting(false);
        return;
      }

      // Map category to backend enum
      const mappedCategory = categoryMap[formData.category] || 'other';

      const payload = {
        title: formData.name,
        description: formData.description,
        category: mappedCategory,
        business: businessId,
        pricing: {
          price: Number(formData.offerPrice || formData.price),
          originalPrice: Number(formData.price),
          currency: 'RWF',
        },
        inventory: {
          quantity: Number(formData.stock),
          unit: 'item',
        },
        timeWindow: {
          availableFrom: availableFrom.toISOString(),
          availableUntil: availableUntil.toISOString(),
        },
        nutritionalInfo: {
          calories: Number(formData.calories || 0),
          protein: Number(formData.protein || 0),
          carbs: Number(formData.carbs || 0),
          fats: Number(formData.fats || 0),
          allergens: formData.allergens
            ? formData.allergens
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
        images: [], // Start with empty, will upload separately
      };

      // Create listing
      const newListing = await listingService.createListing(payload);

      // Upload images if any
      if (images.length > 0) {
        const imageFormData = new FormData();
        images.forEach((img) => {
          if (img.file) imageFormData.append('photos', img.file);
        });
        await listingService.uploadPhotos(newListing._id, imageFormData);
      }

      toast.success('Listing published successfully!');

      // Reset form but keep vendor name
      setFormData({
        name: '',
        description: '',
        category: '',
        vendor: businessName,
        price: '',
        offerPrice: '',
        pickupFrom: '',
        pickupTo: '',
        stock: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        allergens: '',
        isRecurring: false,
        frequency: 'daily',
        repeatDays: [],
        endDate: '',
      });
      setImages([]);
      setMainImage(null);
    } catch (error) {
      console.error('Creation failed', error);
      // Show more detailed error message
      const errorMessage = error.errors
        ? error.errors.map((e) => e.msg || e.message).join(', ')
        : error.message || 'Failed to create listing';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Show loading while fetching business
  if (isLoadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading business information...</p>
        </div>
      </div>
    );
  }

  // Show error if no business found
  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-8 max-w-md">
          <Package className="w-16 h-16 text-moringa-muted/70 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-moringa dark:text-white mb-2">No Business Found</h2>
          <p className="text-moringa-muted dark:text-slate-400 mb-4">
            You need to have a verified business to create listings.
          </p>
          <button
            onClick={() => navigate('/business-verification')}
            className="px-6 py-2 bg-solid hover:bg-tertiary text-white font-medium rounded-lg transition-colors"
          >
            Complete Business Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
            <h2 className="text-2xl font-bold text-moringa dark:text-white mb-6">
              Create New Listing
            </h2>

            <form className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                    Product Images
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Product"
                          className="w-24 h-24 object-cover rounded-lg border-2 border-hairline dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 border-2 border-dashed border-solid dark:border-solid rounded-lg flex items-center justify-center cursor-pointer hover:bg-solid/5 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-solid" />
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Product Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all resize-none"
                    placeholder="Describe your product"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat.path}>
                          {cat.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="stock"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Stock Count
                    </label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Price
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="offerPrice"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Offer Price
                    </label>
                    <input
                      type="number"
                      id="offerPrice"
                      name="offerPrice"
                      value={formData.offerPrice}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Window */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <h3 className="text-lg font-semibold text-moringa dark:text-white">
                  Pickup Window
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="pickupFrom"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      From
                    </label>
                    <input
                      type="datetime-local"
                      id="pickupFrom"
                      name="pickupFrom"
                      value={formData.pickupFrom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pickupTo"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      To
                    </label>
                    <input
                      type="datetime-local"
                      id="pickupTo"
                      name="pickupTo"
                      value={formData.pickupTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Nutritional Information */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <h3 className="text-lg font-semibold text-moringa dark:text-white">
                  Nutritional Information{' '}
                  <span className="text-xs font-normal text-moringa-muted">(Optional)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="calories"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Calories
                    </label>
                    <input
                      type="number"
                      id="calories"
                      name="calories"
                      value={formData.calories}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="kcal"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="protein"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Protein
                    </label>
                    <input
                      type="number"
                      id="protein"
                      name="protein"
                      value={formData.protein}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="carbs"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Carbs
                    </label>
                    <input
                      type="number"
                      id="carbs"
                      name="carbs"
                      value={formData.carbs}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fats"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Fats
                    </label>
                    <input
                      type="number"
                      id="fats"
                      name="fats"
                      value={formData.fats}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="allergens"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Allergens
                  </label>
                  <input
                    type="text"
                    id="allergens"
                    name="allergens"
                    value={formData.allergens}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="e.g., Nuts, Dairy, Gluten"
                  />
                </div>
              </div>

              {/* Recurring Listing */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-moringa dark:text-white">
                    Recurring Listing
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-solid transition-colors duration-200"></div>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-4 pl-4 border-l-2 border-solid">
                    <div>
                      <label
                        htmlFor="frequency"
                        className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                      >
                        Frequency
                      </label>
                      <select
                        id="frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    {formData.frequency === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                          Repeat On
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDayToggle(day)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.repeatDays.includes(day)
                                  ? 'bg-solid text-white'
                                  : 'bg-fufu-dim dark:bg-slate-800 text-moringa dark:text-slate-300 hover:bg-mint dark:hover:bg-slate-700'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                      >
                        End Date{' '}
                        <span className="text-xs font-normal text-moringa-muted">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-hairline dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-solid hover:bg-tertiary text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Listing'}
                </button>
                <button
                  type="button"
                  className="flex-1 px-6 py-3 bg-hairline dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-moringa dark:text-white font-medium rounded-lg transition-colors"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Preview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Preview Card */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-moringa dark:text-white mb-4">
              Customer Preview
            </h3>
            <div
              className="relative border rounded-xl bg-white w-full shadow-md overflow-hidden"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {/* Discount Badge */}
              {formData.price && formData.offerPrice && formData.offerPrice < formData.price && (
                <div
                  className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold text-white z-10"
                  style={{ backgroundColor: 'var(--color-solidOne)' }}
                >
                  {Math.round(((formData.price - formData.offerPrice) / formData.price) * 100)}% OFF
                </div>
              )}

              <div className="relative h-40 overflow-hidden">
                {mainImage ? (
                  <img
                    className="w-full h-full object-cover"
                    src={mainImage.preview}
                    alt="Product preview"
                  />
                ) : (
                  <div className="w-full h-full bg-hairline flex items-center justify-center">
                    <Package className="w-12 h-12 text-moringa-muted/70" />
                  </div>
                )}
              </div>

              <div className="text-sm px-4 pb-3 pt-2">
                <p
                  className="font-medium text-base truncate w-full mb-0.5"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  {formData.name || 'Product Name'}
                </p>
                <div
                  className="flex items-center gap-1 text-xs mb-0.5"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  <span>{formData.vendor || 'Vendor Name'}</span>
                  <span>•</span>
                  <span className="font-medium" style={{ color: 'var(--color-solid)' }}>
                    1km
                  </span>
                </div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-moringa-muted)' }}>
                  Pickup at{' '}
                  {formData.pickupFrom && formData.pickupTo
                    ? `${new Date(formData.pickupFrom).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(formData.pickupTo).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                    : '4PM - 6PM Today'}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-solid)' }}>
                      RWF {formData.offerPrice ? Number(formData.offerPrice).toLocaleString() : '0'}
                    </p>
                    {formData.price && (
                      <p
                        className="text-xs line-through"
                        style={{ color: 'var(--color-moringa-muted)' }}
                      >
                        RWF {Number(formData.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <button
                      className="flex items-center justify-center gap-1 border w-20 h-[34px] rounded font-medium text-white text-xs"
                      style={{
                        backgroundColor: 'var(--color-solid)',
                        borderColor: 'var(--color-solid)',
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listing Photo Management */}
          {mainImage && (
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-moringa dark:text-white mb-4">
                Listing Photo
              </h3>
              <div className="relative group">
                <img
                  src={mainImage.preview}
                  alt="Main listing"
                  className="w-full h-64 object-cover rounded-lg border border-hairline dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className="p-3 bg-white hover:bg-white rounded-lg transition-colors"
                    title="Resize"
                  >
                    <Maximize2 className="w-5 h-5 text-moringa" />
                  </button>
                  <button
                    type="button"
                    className="p-3 bg-white hover:bg-white rounded-lg transition-colors"
                    title="Crop"
                  >
                    <Crop className="w-5 h-5 text-moringa" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(mainImage.id)}
                    className="p-3 bg-red-500/90 hover:bg-red-500 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditListing = ({ product, onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Parse time from ISO string or Date
  const getLocalDatetime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    name: product.title || product.name || '',
    description: product.description || '',
    category: product.category || '',
    vendor: product.business?.name || '',
    price: product.pricing?.originalPrice || product.price || '',
    offerPrice: product.pricing?.price || product.offerPrice || '',
    pickupFrom: getLocalDatetime(product.timeWindow?.availableFrom || product.pickupWindow?.start),
    pickupTo: getLocalDatetime(product.timeWindow?.availableUntil || product.pickupWindow?.end),
    stock: product.inventory?.quantity || product.quantity || '',
    calories: product.nutritionalInfo?.calories || '',
    protein: product.nutritionalInfo?.protein || '',
    carbs: product.nutritionalInfo?.carbs || '',
    fats: product.nutritionalInfo?.fats || '',
    allergens: product.nutritionalInfo?.allergens?.join(', ') || '',
    isRecurring: false, // Legacy support if needed
    frequency: 'daily',
    repeatDays: [],
    endDate: '',
  });

  const [images, setImages] = useState(
    (product.images || product.image || []).map((img, index) => ({
      file: null,
      preview: img, // URL
      id: `existing-${index}`,
      isExisting: true,
    }))
  );
  const [mainImage, setMainImage] = useState(images[0] || null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // ... (reuse handleDayToggle, handleImageUpload, removeImage from NewListing or define here)
  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(day)
        ? prev.repeatDays.filter((d) => d !== day)
        : [...prev.repeatDays, day],
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file), // Helper for preview
      id: Math.random().toString(36).substr(2, 9),
      isExisting: false,
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (!mainImage && newImages.length > 0) {
      setMainImage(newImages[0]);
    }
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (mainImage?.id === id) {
      const remaining = images.filter((img) => img.id !== id);
      setMainImage(remaining[0] || null);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);

      const startTime = formData.pickupFrom ? new Date(formData.pickupFrom) : new Date(); // Full Date needed for DB
      const endTime = formData.pickupTo ? new Date(formData.pickupTo) : new Date();

      const payload = {
        title: formData.name,
        description: formData.description,
        category: formData.category,
        pricing: {
          price: Number(formData.offerPrice || formData.price),
          originalPrice: Number(formData.price),
          currency: 'RWF',
        },
        inventory: {
          quantity: Number(formData.stock),
          unit: 'item',
        },
        timeWindow: {
          availableFrom: startTime,
          availableUntil: endTime,
        },
        nutritionalInfo: {
          calories: Number(formData.calories || 0),
          protein: Number(formData.protein || 0),
          carbs: Number(formData.carbs || 0),
          fats: Number(formData.fats || 0),
          allergens: formData.allergens ? formData.allergens.split(',').map((s) => s.trim()) : [],
        },
        images: images.filter((img) => img.isExisting).map((img) => img.preview), // Remove deleted existing images
      };

      await listingService.updateListing(product._id, payload);

      // Upload new images
      const newFiles = images.filter((img) => !img.isExisting);
      if (newFiles.length > 0) {
        const imageFormData = new FormData();
        newFiles.forEach((img) => {
          if (img.file) imageFormData.append('photos', img.file);
        });
        await listingService.uploadPhotos(product._id, imageFormData);
      }

      toast.success('Listing updated successfully!');
      onBack(); // Refresh list happens in parent? No, need to trigger refresh.
      // Ideally pass onUpdate callback or use context.
      // For now, onBack triggers re-render of list? List state might be stale.
      // We should probably reload page or refetch in parent.
      window.location.reload(); // Simple fix for now to ensure state sync
    } catch (error) {
      console.error(error);
      toast.error('Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-solid hover:text-tertiary transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to All Listings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
            <h2 className="text-2xl font-bold text-moringa dark:text-white mb-6">Edit Listing</h2>

            <form className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                    Product Images
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {images.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Product"
                          className="w-24 h-24 object-cover rounded-lg border-2 border-hairline dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-24 h-24 border-2 border-dashed border-solid dark:border-solid rounded-lg flex items-center justify-center cursor-pointer hover:bg-solid/5 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-solid" />
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Product Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all resize-none"
                    placeholder="Describe your product"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat.path}>
                          {cat.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="stock"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Stock Count
                    </label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Price
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="offerPrice"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Offer Price
                    </label>
                    <input
                      type="number"
                      id="offerPrice"
                      name="offerPrice"
                      value={formData.offerPrice}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Pickup Window */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <h3 className="text-lg font-semibold text-moringa dark:text-white">
                  Pickup Window
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="pickupFrom"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      From
                    </label>
                    <input
                      type="datetime-local"
                      id="pickupFrom"
                      name="pickupFrom"
                      value={formData.pickupFrom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pickupTo"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      To
                    </label>
                    <input
                      type="datetime-local"
                      id="pickupTo"
                      name="pickupTo"
                      value={formData.pickupTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Nutritional Information */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <h3 className="text-lg font-semibold text-moringa dark:text-white">
                  Nutritional Information{' '}
                  <span className="text-xs font-normal text-moringa-muted">(Optional)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="calories"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Calories
                    </label>
                    <input
                      type="number"
                      id="calories"
                      name="calories"
                      value={formData.calories}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="kcal"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="protein"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Protein
                    </label>
                    <input
                      type="number"
                      id="protein"
                      name="protein"
                      value={formData.protein}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="carbs"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Carbs
                    </label>
                    <input
                      type="number"
                      id="carbs"
                      name="carbs"
                      value={formData.carbs}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fats"
                      className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                    >
                      Fats
                    </label>
                    <input
                      type="number"
                      id="fats"
                      name="fats"
                      value={formData.fats}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      placeholder="g"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="allergens"
                    className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                  >
                    Allergens
                  </label>
                  <input
                    type="text"
                    id="allergens"
                    name="allergens"
                    value={formData.allergens}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                    placeholder="e.g., Nuts, Dairy, Gluten"
                  />
                </div>
              </div>

              {/* Recurring Listing */}
              <div className="space-y-4 pt-4 border-t border-hairline dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-moringa dark:text-white">
                    Recurring Listing
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-solid transition-colors duration-200"></div>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-4 pl-4 border-l-2 border-solid">
                    <div>
                      <label
                        htmlFor="frequency"
                        className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                      >
                        Frequency
                      </label>
                      <select
                        id="frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all cursor-pointer"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    {formData.frequency === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2">
                          Repeat On
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDayToggle(day)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.repeatDays.includes(day)
                                  ? 'bg-solid text-white'
                                  : 'bg-fufu-dim dark:bg-slate-800 text-moringa dark:text-slate-300 hover:bg-mint dark:hover:bg-slate-700'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-moringa dark:text-slate-300 mb-2"
                      >
                        End Date{' '}
                        <span className="text-xs font-normal text-moringa-muted">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-fufu dark:bg-slate-800 border border-hairline dark:border-slate-600 rounded-lg text-sm text-moringa dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-solid focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t border-hairline dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-solid hover:bg-tertiary text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Listing'}
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 px-6 py-3 bg-hairline dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-moringa dark:text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Preview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Preview Card */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-moringa dark:text-white mb-4">
              Customer Preview
            </h3>
            <div
              className="relative border rounded-xl bg-white w-full shadow-md overflow-hidden"
              style={{ borderColor: 'var(--color-hairline)' }}
            >
              {/* Discount Badge */}
              {formData.price && formData.offerPrice && formData.offerPrice < formData.price && (
                <div
                  className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold text-white z-10"
                  style={{ backgroundColor: 'var(--color-solidOne)' }}
                >
                  {Math.round(((formData.price - formData.offerPrice) / formData.price) * 100)}% OFF
                </div>
              )}

              <div className="relative h-40 overflow-hidden">
                {mainImage ? (
                  <img
                    className="w-full h-full object-cover"
                    src={mainImage.preview}
                    alt="Product preview"
                  />
                ) : (
                  <div className="w-full h-full bg-hairline flex items-center justify-center">
                    <Package className="w-12 h-12 text-moringa-muted/70" />
                  </div>
                )}
              </div>

              <div className="text-sm px-4 pb-3 pt-2">
                <p
                  className="font-medium text-base truncate w-full mb-0.5"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  {formData.name || 'Product Name'}
                </p>
                <div
                  className="flex items-center gap-1 text-xs mb-0.5"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  <span>{formData.vendor || 'Vendor Name'}</span>
                  <span>•</span>
                  <span className="font-medium" style={{ color: 'var(--color-solid)' }}>
                    1km
                  </span>
                </div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-moringa-muted)' }}>
                  Pickup at{' '}
                  {formData.pickupFrom && formData.pickupTo
                    ? `${new Date(formData.pickupFrom).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(formData.pickupTo).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                    : product.pickupTime || '4PM - 6PM Today'}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-solid)' }}>
                      RWF {formData.offerPrice ? Number(formData.offerPrice).toLocaleString() : '0'}
                    </p>
                    {formData.price && (
                      <p
                        className="text-xs line-through"
                        style={{ color: 'var(--color-moringa-muted)' }}
                      >
                        RWF {Number(formData.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <button
                      className="flex items-center justify-center gap-1 border w-20 h-[34px] rounded font-medium text-white text-xs"
                      style={{
                        backgroundColor: 'var(--color-solid)',
                        borderColor: 'var(--color-solid)',
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Listing Photo Management */}
          {mainImage && (
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-moringa dark:text-white mb-4">
                Listing Photo
              </h3>
              <div className="relative group">
                <img
                  src={mainImage.preview}
                  alt="Main listing"
                  className="w-full h-64 object-cover rounded-lg border border-hairline dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className="p-3 bg-white hover:bg-white rounded-lg transition-colors"
                    title="Resize"
                  >
                    <Maximize2 className="w-5 h-5 text-moringa" />
                  </button>
                  <button
                    type="button"
                    className="p-3 bg-white hover:bg-white rounded-lg transition-colors"
                    title="Crop"
                  >
                    <Crop className="w-5 h-5 text-moringa" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(mainImage.id)}
                    className="p-3 bg-red-500/90 hover:bg-red-500 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
