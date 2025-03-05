'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TaxReturnPDFLink } from '@/components/TaxReturnPDF';

export default function TaxReturnSuccessPage() {
  const params = useParams();
  const [taxReturn, setTaxReturn] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchTaxReturn = async () => {
      try {
        const response = await fetch(`/api/dashboard/tax-returns/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch tax return details');
        const data = await response.json();
        setTaxReturn(data);
      } catch (error) {
        setError('Unable to load tax return details');
        console.error('Error:', error);
      }
    };

    if (params.id) {
      fetchTaxReturn();
    }
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-red-600 text-center">
              <p>{error}</p>
              <Link
                href="/dashboard/tax-returns"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Return to Tax Returns
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!taxReturn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-pulse">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Tax Return Successfully Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Your ITR-1 for Assessment Year {taxReturn.assessmentYear} has been successfully filed.
              You can download your tax return document or return to the dashboard.
            </p>

            <div className="space-y-4">
              {taxReturn.data && (
                <TaxReturnPDFLink
                  data={taxReturn.data}
                  calculations={{
                    totalIncome: taxReturn.data.salaryIncome.netSalary +
                      taxReturn.data.housePropertyIncome.totalIncomeFromHP +
                      taxReturn.data.otherIncome.totalOtherIncome,
                    breakdown: [], // This will be calculated in the PDF component
                    totalTax: 0, // This will be calculated in the PDF component
                    cess: 0,
                    finalTax: 0,
                  }}
                />
              )}

              <div className="mt-4">
                <Link
                  href="/dashboard/tax-returns"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Return to Tax Returns
                </Link>
              </div>
            </div>

            <div className="mt-8 text-sm text-gray-500">
              <p>Reference ID: {params.id}</p>
              <p>Filed on: {new Date(taxReturn.filingDate || taxReturn.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}