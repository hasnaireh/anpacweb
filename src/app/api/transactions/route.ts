import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    
    let query = supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (
          id,
          quantity,
          price,
          products (
            name,
            sku
          )
        )
      `)
      .eq('type', 'OUT')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (date) {
      query = query.eq('date', date)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      total: data?.length || 0
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Start a transaction-like operation
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        type: body.type,
        total_amount: body.total_amount,
        status: body.status,
        customer_name: body.customer_name || null,
        customer_phone: body.customer_phone || null,
        date: body.date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (transactionError) throw transactionError

    // Insert transaction items
    if (body.items && body.items.length > 0) {
      const transactionItems = body.items.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ 
      success: true, 
      data: transaction 
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}