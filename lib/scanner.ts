export type ExtractedInvoice = {
  vendor: string
  date: string
  total: number
  currency: string
  category: string
  description: string
  line_items: { description: string; amount: number }[]
  vat_amount: number | null
  invoice_number: string | null
  confidence: number
  error?: string
}

export type InvoiceScan = {
  id: string
  user_id: string
  raw_text: string | null
  image_url: string | null
  status: 'pending' | 'processed' | 'imported' | 'failed'
  extracted_data: ExtractedInvoice | null
  finance_transaction_id: string | null
  created_at: string
}
