import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    flex: 2,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  total: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
  },
  detailsTable: {
    width: '100%',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    minHeight: 24,
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  col1: {
    flex: 1,
    paddingRight: 8,
  },
  col2: {
    flex: 2,
    paddingRight: 8,
  },
  col3: {
    flex: 1,
    textAlign: 'right',
  },
});

interface TaxReturnPDFProps {
  data: {
    // Filing Status
    returnFileSec: 11 | 12 | 13 | 14 | 16 | 17 | 18 | 20 | 21; // As per ITR-1 schema
    optOutNewTaxRegime: 'Y' | 'N';
    filingDate?: string;
    itrFilingDueDate: string;
    // Personal Information
    assessmentYear: string;
    status: string;
    pan: string;
    aadhaarNumber?: string;
    name: {
      firstName?: string;
      middleName?: string;
      lastName: string;
    };
    address: {
      residenceNo: string;
      residenceName?: string;
      roadOrStreet?: string;
      locality: string;
      city: string;
      state: string;
      pinCode: string;
      countryCode: string;
      countryCodeMobile: string;
      mobileNo: string;
      email: string;
    };
    employerCategory: 'CGOV' | 'SGOV' | 'PSU' | 'PE' | 'PESG' | 'PEPS' | 'PEO' | 'OTH' | 'NA';
    // Income Details
    salaryIncome: {
      grossSalary: number;
      salary: number;
      perquisitesValue: number;
      profitsInSalary: number;
      incomeNotified89A: number;
      allowancesExemptUs10: Array<{
        natureDesc: string;
        amount: number;
      }>;
      netSalary: number;
      deductions: {
        standard: number; // Section 16(ia) - Max 50000
        entertainment: number; // Section 16(ii) - Max 5000
        professionalTax: number; // Section 16(iii) - Max 5000
      };
    };
    housePropertyIncome: {
      type: 'S' | 'L' | 'D'; // Self Occupied, Let Out, Deemed Let Out
      grossRent: number;
      taxesPaid: number;
      annualValue: number;
      standardDeduction: number; // 30% of Annual Value
      interestPayable: number;
      totalIncomeFromHP: number;
    };
    otherIncome: {
      natureOfIncome: Array<{
        type: 'SAV' | 'IFD' | 'TAX' | 'FAP' | 'DIV' | 'NOT89A' | 'OTHNOT89A' | 'OTH';
        description?: string;
        amount: number;
      }>;
      deductionUs57iia: number; // Max 15000
      totalOtherIncome: number;
    };
    // Deductions Chapter VI-A with maximum limits as per schema
    deductions: {
      section80C: number; // Max 150000
      section80CCC: number; // Max 150000
      section80CCDEmployee: number; // Max 150000
      section80CCD1B: number; // Max 50000
      section80CCDEmployer: number;
      section80D: number; // Max 100000
      section80DD: number; // Max 125000
      section80DDB: number; // Max 100000
      section80E: number;
      section80EE: number; // Max 50000
      section80EEA: number; // Max 150000
      section80EEB: number; // Max 150000
      section80G: number;
      section80GG: number; // Max 60000
      section80GGA: number;
      section80GGC: number;
      section80TTA: number; // Max 10000
      section80TTB: number; // Max 50000
      section80U: number; // Max 125000
      totalDeductions: number;
    };
  };
  calculations: {
    totalIncome: number;
    breakdown: Array<{
      slab: string;
      taxableAmount: number;
      taxAmount: number;
    }>;
    totalTaxPayable: number;
    rebate87A: number; // Max 25000
    taxPayableOnRebate: number;
    educationCess: number; // 4% of tax
    grossTaxLiability: number;
    interestPayments: {
      section234A: number;
      section234B: number;
      section234C: number;
      lateFilingFee234F: number;
    };
    section89: number;
    netTaxLiability: number;
    totalTaxPlusInterest: number;
  };
}

const TaxReturnPDF = ({ data, calculations }: TaxReturnPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>INDIAN INCOME TAX RETURN - ITR-1 SAHAJ</Text>
        <Text style={styles.subtitle}>Assessment Year: {data.assessmentYear}</Text>
        <View style={styles.row}>
          <Text>PAN: {data.pan}</Text>
          <Text>Status: {data.status}</Text>
        </View>
        <View style={styles.row}>
          <Text>Filing Under Section: {data.returnFileSec}</Text>
          <Text>Due Date: {data.itrFilingDueDate}</Text>
        </View>
        {data.filingDate && (
          <View style={styles.row}>
            <Text>Filed Date: {data.filingDate}</Text>
            <Text>New Tax Regime Opted Out: {data.optOutNewTaxRegime}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {data.name ? [
              data.name.firstName || '',
              data.name.middleName || '',
              data.name.lastName
            ].filter(Boolean).join(' ') : 'N/A'}
          </Text>
        </View>
        {data.aadhaarNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Aadhaar Number</Text>
            <Text style={styles.value}>{data.aadhaarNumber}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>
            {data.address ? [
              data.address.residenceNo,
              data.address.residenceName,
              data.address.roadOrStreet,
              data.address.locality,
              data.address.city,
              data.address.state,
              data.address.pinCode
            ].filter(Boolean).join(', ') : 'N/A'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mobile</Text>
          <Text style={styles.value}>
            {data.address ? `+${data.address.countryCodeMobile}-${data.address.mobileNo}` : 'N/A'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{data.address?.email || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Employer Category</Text>
          <Text style={styles.value}>{data.employerCategory || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Income Details</Text>
        
        <Text style={styles.subtitle}>Income from Salary</Text>
        <View style={styles.detailsTable}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col2}>Particulars</Text>
            <Text style={styles.col3}>Amount (₹)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Gross Salary</Text>
            <Text style={styles.col3}>{data.salaryIncome?.grossSalary?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Salary (as per section 17(1))</Text>
            <Text style={styles.col3}>{data.salaryIncome?.salary?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Value of Perquisites</Text>
            <Text style={styles.col3}>{data.salaryIncome?.perquisitesValue?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Profits in Salary</Text>
            <Text style={styles.col3}>{data.salaryIncome?.profitsInSalary?.toLocaleString() || '0'}</Text>
          </View>
          {data.salaryIncome?.allowancesExemptUs10?.map((allowance, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col2}>Exempt Allowance - {allowance.natureDesc}</Text>
              <Text style={styles.col3}>{allowance.amount.toLocaleString()}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.total]}>
            <Text style={styles.col2}>Net Salary</Text>
            <Text style={styles.col3}>{data.salaryIncome?.netSalary?.toLocaleString() || '0'}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Income from House Property</Text>
        <View style={styles.detailsTable}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col2}>Particulars</Text>
            <Text style={styles.col3}>Amount (₹)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Type of House Property</Text>
            <Text style={styles.col3}>
              {data.housePropertyIncome?.type === 'S' ? 'Self Occupied' : 
               data.housePropertyIncome?.type === 'L' ? 'Let Out' : 
               data.housePropertyIncome?.type === 'D' ? 'Deemed Let Out' : 'N/A'}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Gross Rent Received</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.grossRent?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Municipal Taxes Paid</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.taxesPaid?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Annual Value</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.annualValue?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Standard Deduction (30%)</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.standardDeduction?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Interest on Housing Loan</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.interestPayable?.toLocaleString() || '0'}</Text>
          </View>
          <View style={[styles.tableRow, styles.total]}>
            <Text style={styles.col2}>Income from House Property</Text>
            <Text style={styles.col3}>{data.housePropertyIncome?.totalIncomeFromHP?.toLocaleString() || '0'}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Income from Other Sources</Text>
        <View style={styles.detailsTable}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col2}>Nature of Income</Text>
            <Text style={styles.col3}>Amount (₹)</Text>
          </View>
          {data.otherIncome?.natureOfIncome?.map((income, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col2}>
                {income.type === 'SAV' ? 'Interest from Savings Account' :
                 income.type === 'IFD' ? 'Interest from Deposits' :
                 income.type === 'TAX' ? 'Interest from Income Tax Refund' :
                 income.type === 'FAP' ? 'Family Pension' :
                 income.type === 'DIV' ? 'Dividend Income' :
                 income.type === 'NOT89A' ? 'Income from retirement benefit account (89A)' :
                 income.type === 'OTHNOT89A' ? 'Other retirement benefit income' :
                 income.description || 'Other Income'}
              </Text>
              <Text style={styles.col3}>{income.amount?.toLocaleString() || '0'}</Text>
            </View>
          ))}
          {(data.otherIncome?.deductionUs57iia || 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.col2}>Less: Deduction u/s 57(iia)</Text>
              <Text style={styles.col3}>{data.otherIncome.deductionUs57iia.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.tableRow, styles.total]}>
            <Text style={styles.col2}>Total Income from Other Sources</Text>
            <Text style={styles.col3}>{data.otherIncome?.totalOtherIncome?.toLocaleString() || '0'}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Deductions under Chapter VI-A</Text>
        <View style={styles.detailsTable}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col1}>Section</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Amount (₹)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>80C</Text>
            <Text style={styles.col2}>Life Insurance, PPF, etc.</Text>
            <Text style={styles.col3}>{data.deductions?.section80C?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>80CCD(1B)</Text>
            <Text style={styles.col2}>NPS Contribution</Text>
            <Text style={styles.col3}>{data.deductions?.section80CCD1B?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>80D</Text>
            <Text style={styles.col2}>Health Insurance</Text>
            <Text style={styles.col3}>{data.deductions?.section80D?.toLocaleString() || '0'}</Text>
          </View>
          <View style={[styles.tableRow, styles.total]}>
            <Text style={styles.col1}></Text>
            <Text style={styles.col2}>Total Deductions</Text>
            <Text style={styles.col3}>{data.deductions?.totalDeductions?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Computation</Text>
        <View style={styles.detailsTable}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col2}>Particulars</Text>
            <Text style={styles.col3}>Amount (₹)</Text>
          </View>
          {calculations?.breakdown?.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col2}>{item.slab}</Text>
              <Text style={styles.col3}>{item.taxAmount?.toLocaleString() || '0'}</Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Total Tax Payable</Text>
            <Text style={styles.col3}>{calculations?.totalTaxPayable?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Rebate u/s 87A</Text>
            <Text style={styles.col3}>{calculations?.rebate87A?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Education Cess (4%)</Text>
            <Text style={styles.col3}>{calculations?.educationCess?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col2}>Interest Payments</Text>
            <Text style={styles.col3}>{(
              (calculations?.interestPayments?.section234A || 0) +
              (calculations?.interestPayments?.section234B || 0) +
              (calculations?.interestPayments?.section234C || 0)
            ).toLocaleString()}</Text>
          </View>
          {calculations?.interestPayments?.lateFilingFee234F > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.col2}>Late Filing Fee u/s 234F</Text>
              <Text style={styles.col3}>{calculations.interestPayments.lateFilingFee234F.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.tableRow, styles.total]}>
            <Text style={styles.col2}>Total Tax + Interest Payable</Text>
            <Text style={styles.col3}>{calculations?.totalTaxPlusInterest?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
        <Text>This is a computer-generated document. No signature is required.</Text>
      </View>
    </Page>
  </Document>
);

export const TaxReturnPDFLink = ({ data, calculations }: TaxReturnPDFProps) => (
  <PDFDownloadLink
    document={<TaxReturnPDF data={data} calculations={calculations} />}
    fileName={`tax-return-${data.assessmentYear}.pdf`}
    className="inline-flex items-center px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
  >
    {({ loading }) => (loading ? 'Generating PDF...' : '📥 Download PDF Report')}
  </PDFDownloadLink>
);