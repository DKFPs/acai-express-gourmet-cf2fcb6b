export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      batch_labels: {
        Row: {
          batch_code: string
          batch_id: string
          company_id: string
          created_at: string
          expires_at: string
          flavor_name: string
          id: string
          manufactured_at: string
          qr_payload: string
          quantity: number
          volume_ml: number
        }
        Insert: {
          batch_code: string
          batch_id: string
          company_id: string
          created_at?: string
          expires_at: string
          flavor_name: string
          id?: string
          manufactured_at: string
          qr_payload: string
          quantity?: number
          volume_ml?: number
        }
        Update: {
          batch_code?: string
          batch_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          flavor_name?: string
          id?: string
          manufactured_at?: string
          qr_payload?: string
          quantity?: number
          volume_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_labels_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_labels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          company_id: string
          created_at: string
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: Database["public"]["Enums"]["cash_register_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id?: string
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id?: string
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          auto_closed: boolean
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          company_id: string
          created_at: string
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: Database["public"]["Enums"]["cash_register_status"]
          total_in: number
          total_out: number
          total_withdrawal: number
          updated_at: string
        }
        Insert: {
          auto_closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id?: string
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          total_in?: number
          total_out?: number
          total_withdrawal?: number
          updated_at?: string
        }
        Update: {
          auto_closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id?: string
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: Database["public"]["Enums"]["cash_register_status"]
          total_in?: number
          total_out?: number
          total_withdrawal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          session_id: string
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          session_id: string
          type: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          session_id?: string
          type?: Database["public"]["Enums"]["cash_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          delivery_fee: number
          free_delivery_above: number | null
          id: string
          logo_url: string | null
          low_stock_alerts: boolean
          min_order_value: number
          opening_hours: Json
          payment_methods: string[]
          primary_color: string
          timezone: string
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_number: string | null
          whatsapp_template: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          free_delivery_above?: number | null
          id?: string
          logo_url?: string | null
          low_stock_alerts?: boolean
          min_order_value?: number
          opening_hours?: Json
          payment_methods?: string[]
          primary_color?: string
          timezone?: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
          whatsapp_template?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          delivery_fee?: number
          free_delivery_above?: number | null
          id?: string
          logo_url?: string | null
          low_stock_alerts?: boolean
          min_order_value?: number
          opening_hours?: Json
          payment_methods?: string[]
          primary_color?: string
          timezone?: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
          whatsapp_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_goals: {
        Row: {
          company_id: string
          created_at: string
          daily_goal: number
          id: string
          monthly_goal: number
          updated_at: string
          weekly_goal: number
        }
        Insert: {
          company_id?: string
          created_at?: string
          daily_goal?: number
          id?: string
          monthly_goal?: number
          updated_at?: string
          weekly_goal?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_goal?: number
          id?: string
          monthly_goal?: number
          updated_at?: string
          weekly_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_product_movements: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          finished_product_id: string
          id: string
          quantity: number
          reason: string | null
          type: Database["public"]["Enums"]["finished_movement_type"]
        }
        Insert: {
          batch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          finished_product_id: string
          id?: string
          quantity: number
          reason?: string | null
          type: Database["public"]["Enums"]["finished_movement_type"]
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          finished_product_id?: string
          id?: string
          quantity?: number
          reason?: string | null
          type?: Database["public"]["Enums"]["finished_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finished_product_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_product_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_product_movements_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_products: {
        Row: {
          company_id: string
          created_at: string
          id: string
          min_stock: number
          name: string
          product_id: string | null
          quantity_available: number
          quantity_discarded: number
          quantity_produced: number
          quantity_reserved: number
          quantity_sold: number
          recipe_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          product_id?: string | null
          quantity_available?: number
          quantity_discarded?: number
          quantity_produced?: number
          quantity_reserved?: number
          quantity_sold?: number
          recipe_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          product_id?: string | null
          quantity_available?: number
          quantity_discarded?: number
          quantity_produced?: number
          quantity_reserved?: number
          quantity_sold?: number
          recipe_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finished_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          min_stock: number
          name: string
          notes: string | null
          purchase_price: number
          quantity: number
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          link: string | null
          message: string | null
          read_by: string[]
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_by?: string[]
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_by?: string[]
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number | null
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          discount: number
          id: string
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_stock: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          min_stock: number
          name: string
          quantity: number
          type: Database["public"]["Enums"]["packaging_type"]
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          quantity?: number
          type: Database["public"]["Enums"]["packaging_type"]
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          quantity?: number
          type?: Database["public"]["Enums"]["packaging_type"]
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_code: string | null
          batches: number
          company_id: string
          created_at: string
          created_by: string | null
          discarded_quantity: number
          expires_at: string | null
          id: string
          notes: string | null
          produced_at: string
          produced_quantity: number
          recipe_id: string
          responsible_id: string | null
          responsible_name: string | null
          status: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          batch_code?: string | null
          batches?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          discarded_quantity?: number
          expires_at?: string | null
          id?: string
          notes?: string | null
          produced_at?: string
          produced_quantity?: number
          recipe_id: string
          responsible_id?: string | null
          responsible_name?: string | null
          status?: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          batch_code?: string | null
          batches?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          discarded_quantity?: number
          expires_at?: string | null
          id?: string
          notes?: string | null
          produced_at?: string
          produced_quantity?: number
          recipe_id?: string
          responsible_id?: string | null
          responsible_name?: string | null
          status?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          ingredient_id: string | null
          item_name: string
          packaging_id: string | null
          quantity: number
          total_cost: number | null
          unit: string
          unit_cost: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          item_name: string
          packaging_id?: string | null
          quantity?: number
          total_cost?: number | null
          unit?: string
          unit_cost?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          item_name?: string
          packaging_id?: string | null
          quantity?: number
          total_cost?: number | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_items_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "packaging_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          company_id: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          internal_code: string | null
          margin_percent: number | null
          min_stock: number
          name: string
          price: number
          promo_price: number | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          internal_code?: string | null
          margin_percent?: number | null
          min_stock?: number
          name: string
          price?: number
          promo_price?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          internal_code?: string | null
          margin_percent?: number | null
          min_stock?: number
          name?: string
          price?: number
          promo_price?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_cost_history: {
        Row: {
          company_id: string
          cost_per_unit: number
          created_at: string
          id: string
          ingredients_cost: number
          margin_percent: number
          min_sale_price: number
          packaging_cost: number
          reason: string | null
          recipe_id: string
          total_cost: number
        }
        Insert: {
          company_id: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredients_cost?: number
          margin_percent?: number
          min_sale_price?: number
          packaging_cost?: number
          reason?: string | null
          recipe_id: string
          total_cost?: number
        }
        Update: {
          company_id?: string
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredients_cost?: number
          margin_percent?: number
          min_sale_price?: number
          packaging_cost?: number
          reason?: string | null
          recipe_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_cost_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_cost_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          notes: string | null
          quantity: number
          recipe_id: string
          sort_order: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          notes?: string | null
          quantity?: number
          recipe_id: string
          sort_order?: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          notes?: string | null
          quantity?: number
          recipe_id?: string
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          bottle_volume_ml: number
          category_id: string | null
          company_id: string
          cost_per_unit: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          ingredients_cost: number
          margin_percent: number
          min_sale_price: number
          name: string
          packaging_cost: number
          prep_time_minutes: number
          profit_per_unit: number
          sale_price: number
          shelf_life_days: number
          status: Database["public"]["Enums"]["product_status"]
          target_margin_percent: number
          total_cost: number
          updated_at: string
          yield_quantity: number
        }
        Insert: {
          bottle_volume_ml?: number
          category_id?: string | null
          company_id: string
          cost_per_unit?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients_cost?: number
          margin_percent?: number
          min_sale_price?: number
          name: string
          packaging_cost?: number
          prep_time_minutes?: number
          profit_per_unit?: number
          sale_price?: number
          shelf_life_days?: number
          status?: Database["public"]["Enums"]["product_status"]
          target_margin_percent?: number
          total_cost?: number
          updated_at?: string
          yield_quantity?: number
        }
        Update: {
          bottle_volume_ml?: number
          category_id?: string | null
          company_id?: string
          cost_per_unit?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients_cost?: number
          margin_percent?: number
          min_sale_price?: number
          name?: string
          packaging_cost?: number
          prep_time_minutes?: number
          profit_per_unit?: number
          sale_price?: number
          shelf_life_days?: number
          status?: Database["public"]["Enums"]["product_status"]
          target_margin_percent?: number
          total_cost?: number
          updated_at?: string
          yield_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          order_id: string | null
          quantity: number
          reason: string | null
          total_cost: number | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_cost: number
        }
        Insert: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          order_id?: string | null
          quantity: number
          reason?: string | null
          total_cost?: number | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          order_id?: string | null
          quantity?: number
          reason?: string | null
          total_cost?: number | null
          type?: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          label: string
          path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          notifications_enabled: boolean
          sidebar_collapsed: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          notifications_enabled?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          notifications_enabled?: boolean
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      customer_stats: {
        Args: never
        Returns: {
          customer_id: string
          last_purchase: string
          orders_count: number
          total_spent: number
        }[]
      }
      discard_batch: {
        Args: { _batch_id: string; _quantity?: number; _reason?: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: { Args: never; Returns: boolean }
      produce_batch: {
        Args: {
          _batches: number
          _notes?: string
          _produced_at?: string
          _recipe_id: string
          _responsible_id?: string
        }
        Returns: string
      }
      recalc_recipe_costs: {
        Args: { _reason?: string; _recipe_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "administrador" | "funcionario"
      cash_register_status: "aberto" | "fechado"
      cash_transaction_type: "entrada" | "saida" | "sangria"
      financial_entry_status: "pago" | "pendente" | "cancelado"
      financial_entry_type: "receita" | "despesa" | "compra" | "investimento"
      finished_movement_type:
        | "producao"
        | "venda"
        | "descarte"
        | "reserva"
        | "ajuste"
        | "estorno"
      movement_type: "entrada" | "saida" | "ajuste"
      order_status:
        | "recebido"
        | "preparando"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
      packaging_type:
        | "garrafa"
        | "tampa"
        | "canudo"
        | "lacre"
        | "etiqueta"
        | "outro"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "outro"
      payment_status: "pendente" | "pago" | "estornado"
      product_status: "ativo" | "inativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "funcionario"],
      cash_register_status: ["aberto", "fechado"],
      cash_transaction_type: ["entrada", "saida", "sangria"],
      financial_entry_status: ["pago", "pendente", "cancelado"],
      financial_entry_type: ["receita", "despesa", "compra", "investimento"],
      finished_movement_type: [
        "producao",
        "venda",
        "descarte",
        "reserva",
        "ajuste",
        "estorno",
      ],
      movement_type: ["entrada", "saida", "ajuste"],
      order_status: [
        "recebido",
        "preparando",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
      packaging_type: [
        "garrafa",
        "tampa",
        "canudo",
        "lacre",
        "etiqueta",
        "outro",
      ],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "outro",
      ],
      payment_status: ["pendente", "pago", "estornado"],
      product_status: ["ativo", "inativo"],
    },
  },
} as const
