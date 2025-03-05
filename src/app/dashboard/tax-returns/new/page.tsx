'use client';

import TaxReturnForm from '../components/TaxReturnForm';

export default function NewTaxReturnPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">File New Tax Return</h1>
      <TaxReturnForm />
    </div>
  );
}