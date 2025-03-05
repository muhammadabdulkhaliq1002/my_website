'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TaxReturnPDFLink } from '@/components/TaxReturnPDF';
import { useFinancialYear } from '@/app/dashboard/layout';

// Add new types
type TaxReturnStatus = 'DRAFT' | 'FINAL';
type TaxSlab = {
  min: number;
  max: number | null;
  rate: number;
};

interface IncomeFormData {
  assessmentYear: string;
  salaryIncome: number;
  businessIncome: number;
  housePropertyIncome: number;
  capitalGains: number;
  otherIncome: number;
  status: TaxReturnStatus;
}

interface TaxReturn {
  id: string;
  assessmentYear: string;
  status: string;
  createdAt: string;
  incomeDetails: {
    salaryIncome: number;
    businessIncome: number;
    housePropertyIncome: number;
    capitalGains: number;
    otherIncome: number;
  };
}

interface ValidationErrors {
  [key: string]: string;
}

interface TaxBreakdown {
  slab: string;
  taxableAmount: number;
  taxAmount: number;
}

interface ValidationState {
  [key: string]: {
    isValid: boolean;
    message?: string;
  };
}

export default function TaxReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { selectedYear } = useFinancialYear();
  const [showPreview, setShowPreview] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [taxReturns, setTaxReturns] = useState<TaxReturn[]>([]);

  // Generate assessment years based on current date
  const assessmentYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => {
      const year = currentYear - i;
      return `${year}-${year + 1}`;
    });
  }, []);
  
  const [formData, setFormData] = useState<IncomeFormData>({
    assessmentYear: selectedYear,
    salaryIncome: 0,
    businessIncome: 0,
    housePropertyIncome: 0,
    capitalGains: 0,
    otherIncome: 0,
    status: 'DRAFT'
  });

  const [fieldValidation, setFieldValidation] = useState<ValidationState>({
    salaryIncome: { isValid: true },
    businessIncome: { isValid: true },
    housePropertyIncome: { isValid: true },
    capitalGains: { isValid: true },
    otherIncome: { isValid: true },
  });

  // Define tax slabs
  const TAX_SLABS: TaxSlab[] = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 0.05 },
    { min: 500000, max: 750000, rate: 0.10 },
    { min: 750000, max: 1000000, rate: 0.15 },
    { min: 1000000, max: 1250000, rate: 0.20 },
    { min: 1250000, max: 1500000, rate: 0.25 },
    { min: 1500000, max: null, rate: 0.30 }
  ];

  // Enhanced tax calculations with breakdown
  const calculations = useMemo(() => {
    const totalIncome = 
      formData.salaryIncome +
      formData.businessIncome +
      formData.housePropertyIncome +
      formData.capitalGains +
      formData.otherIncome;

    let remainingIncome = totalIncome;
    let totalTax = 0;
    const breakdown: TaxBreakdown[] = [];

    for (const slab of TAX_SLABS) {
      if (remainingIncome <= 0) break;

      const slabSize = slab.max ? slab.max - slab.min : remainingIncome;
      const taxableInThisSlab = Math.min(remainingIncome, slabSize);
      const taxForThisSlab = taxableInThisSlab * slab.rate;

      if (taxForThisSlab > 0) {
        breakdown.push({
          slab: `₹${slab.min.toLocaleString()} to ${slab.max ? `₹${slab.max.toLocaleString()}` : 'above'}`,
          taxableAmount: taxableInThisSlab,
          taxAmount: taxForThisSlab
        });
      }

      totalTax += taxForThisSlab;
      remainingIncome -= slabSize;
    }

    // Add health and education cess (4%)
    const cess = totalTax * 0.04;
    
    return {
      totalIncome,
      breakdown,
      totalTax,
      cess,
      finalTax: Math.round(totalTax + cess)
    };
  }, [formData]);

  useEffect(() => {
    fetchTaxReturns();
  }, []);

  useEffect(() => {
    if (editId) {
      fetchTaxReturn(editId);
    }
  }, [editId]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (editId && !isLoading && !showPreview) {
        setIsAutoSaving(true);
        try {
          await handleSave();
          setLastSaved(new Date());
        } finally {
          setIsAutoSaving(false);
        }
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [formData, editId]);

  const fetchTaxReturns = async () => {
    try {
      const response = await fetch(`/api/dashboard/tax-returns?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch tax returns');
      const data = await response.json();
      setTaxReturns(data);
    } catch (error) {
      setError('Failed to load tax returns');
    }
  };

  useEffect(() => {
    fetchTaxReturns();
  }, [selectedYear]); // Re-fetch when financial year changes

  const fetchTaxReturn = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboard/tax-returns/${id}`);
      if (!response.ok) throw new Error('Failed to fetch tax return');
      const data = await response.json();
      setFormData({
        assessmentYear: data.assessmentYear,
        ...data.incomeDetails,
        status: data.status
      });
    } catch (error) {
      setError('Failed to load tax return');
    }
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};
    
    if (!formData.assessmentYear) {
      errors.assessmentYear = 'Assessment year is required';
    }

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'assessmentYear' && key !== 'status') {
        if (value < 0) {
          errors[key] = 'Income cannot be negative';
        }
        if (value > 100000000) { // 10 Crore limit
          errors[key] = 'Income value seems unusually high. Please verify.';
        }
        if (isNaN(value)) {
          errors[key] = 'Please enter a valid number';
        }
      }
    });

    // Additional validations for final submission
    if (formData.status === 'FINAL') {
      if (!formData.salaryIncome && !formData.businessIncome && 
          !formData.housePropertyIncome && !formData.capitalGains && 
          !formData.otherIncome) {
        errors.general = 'At least one source of income must be provided for final submission';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateField = (name: string, value: number | string) => {
    let isValid = true;
    let message = '';

    if (name === 'assessmentYear') {
      if (!value) {
        isValid = false;
        message = 'Assessment year is required';
      }
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        isValid = false;
        message = 'Please enter a valid number';
      } else if (numValue < 0) {
        isValid = false;
        message = 'Amount cannot be negative';
      } else if (numValue > 100000000) {
        isValid = false;
        message = 'Amount exceeds maximum limit (10 Crore)';
      }
    }

    setFieldValidation(prev => ({
      ...prev,
      [name]: { isValid, message }
    }));

    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'assessmentYear' ? value : parseFloat(value) || 0;
    
    validateField(name, numValue);
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    setError('');
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      const url = editId 
        ? `/api/dashboard/tax-returns/${editId}`
        : '/api/dashboard/tax-returns';
      
      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, status: 'DRAFT' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tax return');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to save tax return');
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent, asFinal: boolean = false) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      const url = editId 
        ? `/api/dashboard/tax-returns/${editId}`
        : '/api/dashboard/tax-returns';
      
      if (asFinal && !showPreview) {
        setShowPreview(true);
        setIsLoading(false);
        return;
      }

      const response = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, status: asFinal ? 'FINAL' : 'DRAFT' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit tax return');
      }

      await fetchTaxReturns();
      router.push('/dashboard/tax-returns');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to submit tax return');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tax Returns</h1>
        <Link
          href="/dashboard/tax-returns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          File New Return
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">ITR-1 SAHAJ</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            For individuals having Income from Salary, House Property, and Other Sources
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <p className="text-sm text-gray-600 mb-4">
            Use this form if your income includes:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
            <li>Salary/Pension Income</li>
            <li>Income from One House Property</li>
            <li>Income from Other Sources (Interest, etc.)</li>
            <li>Agricultural Income up to ₹5,000</li>
            <li>Total Income up to ₹50 lakhs</li>
          </ul>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Begin Filing</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Start a new ITR-1 return or continue with a saved draft.</p>
            </div>
            <div className="mt-5">
              <Link
                href="/dashboard/tax-returns/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start New Return
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Returns</h2>
        {/* List of existing returns will be populated here */}
      </div>
    </div>
  );
}