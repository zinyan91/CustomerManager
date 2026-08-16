import { StyleSheet, Platform, StatusBar } from 'react-native';

export const SAFE_TOP_INSET =
  Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 38) : 12;

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  // WINDOW HEADER STYLES
  windowHeaderBox: {
    backgroundColor: '#FFFFFF',
    paddingTop: SAFE_TOP_INSET,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  windowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backToHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  backToHubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  windowTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  windowTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  windowSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  menuDrawerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SEARCH BAR
  windowSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    marginTop: 4,
  },
  windowSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    marginLeft: 6,
    paddingVertical: 0,
  },

  // LIST CONTAINER
  windowListContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // CARD ITEM STYLES
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  cardItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  cardAddressText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  boldDark: {
    fontWeight: '700',
    color: '#0F172A',
  },
  boldRed: {
    fontWeight: '800',
    color: '#DC2626',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // PILLS & BADGES
  debtPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debtPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  metaMicroLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  dueAmountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dueActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // BUTTONS
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 4,
  },
  callPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  // GRID STATS
  gridThree: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  gridVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },

  // EMPTY CONTAINER
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },

  // SEGMENTED TABS
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    padding: 2,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentedTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // NOTE BOX
  noteBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#2563EB',
  },
  noteText: {
    fontSize: 11,
    color: '#475569',
  },
});
