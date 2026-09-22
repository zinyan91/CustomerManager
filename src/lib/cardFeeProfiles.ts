export interface CardFeeProfile {
  id: string;
  group: string;
  cardType: string;
  productMan: string;
  feeIntProfile: string;
  note?: string;
}

export const COMMON_FEE_NOTE =
  'Không áp dụng đồng thời các ưu đãi chương trình khác và các đối tượng sau:\n- KH phát hành thẻ dưới dạng CBNV, VietbankAMC, CIH, Hoa Lâm, Gia An 115\n- KH đóng thẻ tín dụng và phát hành lại trong vòng 6 tháng kể từ ngày đóng thẻ\n- KH hiện hữu đã có thẻ Vietbank và phát hành thêm thẻ tín dụng';

export const CARD_FEE_GROUPS = [
  'KH thông thường',
  'Khách hàng, Hoa Lâm, Gia An, CIH',
  'CBNV Vietbank, Vietbank AMC',
] as const;

export const CARD_FEE_PROFILES: CardFeeProfile[] = [
  // 1. KH thông thường
  {
    id: 'fee-1',
    group: 'KH thông thường',
    cardType: 'Visa Mystyle',
    productMan: 'MS - VISA_TIN DUNG MYSTYLE',
    feeIntProfile: 'MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM',
  },
  {
    id: 'fee-2',
    group: 'KH thông thường',
    cardType: 'Visa Luxury',
    productMan: 'LU - VISA_TIN DUNG LUXURY',
    feeIntProfile: 'LUX_PRFL2_VISA_LUX 33% MIEN PHI TN 1 NAM',
  },
  {
    id: 'fee-3',
    group: 'KH thông thường',
    cardType: 'Mastercard Credit Lifecare',
    productMan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
    feeIntProfile: 'MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM',
  },
  {
    id: 'fee-4',
    group: 'KH thông thường',
    cardType: 'Mastercard Credit Happy',
    productMan: 'MCCR_STAND - MASTERCARD CREDIT STAND',
    feeIntProfile: 'MCCS_PRF05_MCCR_STAND 33% MIEN PHI PH, TN 1 NAM',
  },
  {
    id: 'fee-5',
    group: 'KH thông thường',
    cardType: 'Napas',
    productMan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
    feeIntProfile: 'NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN',
  },

  // 2. Khách hàng, Hoa Lâm, Gia An, CIH
  {
    id: 'fee-6',
    group: 'Khách hàng, Hoa Lâm, Gia An, CIH',
    cardType: 'Visa Mystyle',
    productMan: 'MS - VISA_TIN DUNG MYSTYLE',
    feeIntProfile: 'MS_PRFL16_VISA_MS 16% CIH_GIA AN MIEN PH, MIEN TN TRON DOI',
  },
  {
    id: 'fee-7',
    group: 'Khách hàng, Hoa Lâm, Gia An, CIH',
    cardType: 'Visa Luxury',
    productMan: 'LU - VISA_TIN DUNG LUXURY',
    feeIntProfile: 'LUX_PRFL16_VISA_LUX 16% CIH_GIA AN MIEN PH, MIEN TN TRON DOI',
  },
  {
    id: 'fee-8',
    group: 'Khách hàng, Hoa Lâm, Gia An, CIH',
    cardType: 'Mastercard Credit Lifecare',
    productMan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
    feeIntProfile: 'MCCP_PRF08_MCCR_PL 16% CIH_GIA AN MIEN PH, MIEN TN TRON DOI',
  },
  {
    id: 'fee-9',
    group: 'Khách hàng, Hoa Lâm, Gia An, CIH',
    cardType: 'Mastercard Credit Happy',
    productMan: 'MCCR_STAND - MASTERCARD CREDIT STAND',
    feeIntProfile: 'MCCS_PRF08_MC_STAND 16% CIH_GIA AN MIEN PH, MIEN TN TRON DOI',
  },
  {
    id: 'fee-10',
    group: 'Khách hàng, Hoa Lâm, Gia An, CIH',
    cardType: 'Napas',
    productMan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
    feeIntProfile: 'NPC_PRFL7_NAPAS_TIN DUNG 18% CIH_GIA AN MIEN PH, MIEN TN TRON DOI',
  },

  // 3. CBNV Vietbank, Vietbank AMC
  {
    id: 'fee-11',
    group: 'CBNV Vietbank, Vietbank AMC',
    cardType: 'Visa Mystyle',
    productMan: 'MS - VISA_TIN DUNG MYSTYLE',
    feeIntProfile: 'MS_PRFL4_VISA_MS CBNV 16% MIEN PHI TN 5 NAM',
  },
  {
    id: 'fee-12',
    group: 'CBNV Vietbank, Vietbank AMC',
    cardType: 'Visa Luxury',
    productMan: 'LU - VISA_TIN DUNG LUXURY',
    feeIntProfile: 'LUX_PRFL4_VISA_LUX CBNV 16% MIEN PHI TN 5 NAM',
  },
  {
    id: 'fee-13',
    group: 'CBNV Vietbank, Vietbank AMC',
    cardType: 'Mastercard Credit Lifecare',
    productMan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
    feeIntProfile: 'MCCP_PRF02_MC_PL 16% CBNV (MIEN PTN,PPH)',
  },
  {
    id: 'fee-14',
    group: 'CBNV Vietbank, Vietbank AMC',
    cardType: 'Mastercard Credit Happy',
    productMan: 'MCCR_STAND - MASTERCARD CREDIT STAND',
    feeIntProfile: 'MCCS_PRF02_MC_STAND 16% CBNV (MIEN PTN,PPH)',
  },
  {
    id: 'fee-15',
    group: 'CBNV Vietbank, Vietbank AMC',
    cardType: 'Napas',
    productMan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
    feeIntProfile: 'NPC_PRFL6_NAPAS_TIN DUNG 18% CBNV MIEN PPH PTN',
  },
];

export function searchCardFeeProfiles(
  query: string,
  groupFilter?: string,
  cardTypeFilter?: string
): CardFeeProfile[] {
  const term = (query || '').toLowerCase().trim();

  return CARD_FEE_PROFILES.filter(p => {
    if (groupFilter && groupFilter !== 'ALL' && p.group !== groupFilter) {
      return false;
    }
    if (cardTypeFilter && cardTypeFilter !== 'ALL' && p.cardType !== cardTypeFilter) {
      return false;
    }
    if (!term) return true;

    return (
      p.group.toLowerCase().includes(term) ||
      p.cardType.toLowerCase().includes(term) ||
      p.productMan.toLowerCase().includes(term) ||
      p.feeIntProfile.toLowerCase().includes(term) ||
      (p.note || '').toLowerCase().includes(term)
    );
  });
}

export type CardNetwork = 'Visa' | 'Napas' | 'Mastercard';

export function detectCardNetwork(text: string): CardNetwork {
  const upper = (text || '').toUpperCase();
  if (upper.includes('NAPAS') || upper.includes('NPC')) return 'Napas';
  if (upper.includes('MASTER') || upper.includes('MCCR') || upper.includes('MC_')) return 'Mastercard';
  return 'Visa';
}

export const DEFAULT_NETWORK_CARDS: Record<CardNetwork, { productPlan: string; feeIntProfile: string }> = {
  Visa: {
    productPlan: 'MS - VISA_TIN DUNG MYSTYLE',
    feeIntProfile: 'MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM',
  },
  Napas: {
    productPlan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
    feeIntProfile: 'NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN',
  },
  Mastercard: {
    productPlan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
    feeIntProfile: 'MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM',
  },
};
