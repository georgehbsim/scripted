export type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  nhi: string | null;
};

export type HistoryPrescription = {
  id: string;
  patient_id: string;
  medication_banner_id: string | null;
  medication_name: string;
  indication: string | null;
  start_date: string | null;
  additional_information: string | null;
  is_prn: boolean;
  is_stat: boolean;
  status: string;
  duration: string | null;
  created_at: string;
  updated_at: string;
  stop_reason: string | null;
  stopped_at: string | null;
  change_reason: string | null;
  available_for_administration: boolean | null;
};

export type HistoryLine = {
  id: string;
  prescription_id: string;
  line_index: number;
  connector_from_prev: "AND" | "THEN" | null;
  dose_text: string;
  dose_amount_low?: number | string | null;
  dose_amount_high?: number | string | null;
  dose_unit?: string | null;
  dose_amount_low_calculated?: number | string | null;
  dose_amount_high_calculated?: number | string | null;
  dose_unit_calculated?: string | null;
  route_codes: string[];
  frequency_code: string;
  duration_key: string;
  selected_product_id?: string | null;
  source_product_code?: string | null;
  product_label?: string | null;
  product_strength?: string | null;
  product_dose_form?: string | null;
  is_prn?: boolean | null;
};

export type DispenseRow = {
  event_id: string;
  event_type: "sent" | "dispensed";
  community_prescription_item_id: string | null;
  prescription_id: string | null;
  medication_banner_id: string | null;
  medication_title: string | null;
  medication_subtitle: string | null;
  authored_supply_text: string | null;
  supply_value: number | null;
  supply_unit: string | null;
  supply_days: number | null;
  authored_repeats_text: string | null;
  repeats_value: number | null;
  blister_pack: boolean | null;
  event_at: string | null;
  dispense_id: string | null;
  dispense_number: number | null;
  dispensed_at: string | null;
  dispensed_by_user_id: string | null;
  community_prescription_id: string | null;
};

export type AdministrationRow = {
  id: string;
  patient_id: string;
  prescription_id: string | null;
  prescription_line_id: string | null;
  medication_banner_id: string | null;
  administered_by_user_id: string | null;
  administration_status: string;
  actual_time: string | null;
  route_used: string | null;
  reason_not_given: string | null;
  note: string | null;
  dose_value: string | null;
  dose_unit: string | null;
  prescribed_dose_value: string | null;
  prescribed_dose_unit: string | null;
  prescribed_dose_text: string | null;
  created_at: string;
  updated_at: string;
  medication_name: string | null;
  prescription_status: string | null;
  line_index: number | null;
  frequency_code: string | null;
  duration_key: string | null;
  product_label: string | null;
};