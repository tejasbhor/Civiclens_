/**
 * Task Detail Styles
 * Comprehensive styles matching ReportDetailScreen design
 */

import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const taskDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Gallery
  gallerySection: {
    width: width,
    height: 300,
    backgroundColor: '#000',
  },
  imageContainer: {
    width: width,
    height: 300,
  },
  galleryImage: {
    width: width,
    height: 300,
  },
  imageTag: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  imageTagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  imageTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  galleryIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  galleryCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  noImagePlaceholder: {
    width: width,
    height: 200,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  noImageText: {
    fontSize: 14,
    color: '#94A3B8',
  },

  // Status Banner
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBannerGradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },

  // SLA Warning
  slaWarning: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slaWarningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Sections
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Meta Grid
  metaGrid: {
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },

  // Notes Card
  notesCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },

  // Location
  locationCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  locationText: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationLandmark: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  openMapsButton: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  openMapsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Timeline
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  timelineUser: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  timelineNotes: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
  },

  // Action Buttons
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#1976D2',
  },
  actionButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  actionButtonOutline: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  actionButtonDanger: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  actionButtonTextOutline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
  },
  actionButtonTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },
  actionButtonWarning: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  actionButtonTextWarning: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 120,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#1976D2',
  },
  modalButtonDanger: {
    backgroundColor: '#F44336',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  modalButtonOutline: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  modalButtonTextOutline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  modalWarning: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -12,
    marginBottom: 16,
  },
  helperTextWarning: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  helperTextSuccess: {
    color: '#10B981',
    fontWeight: '500',
  },
  modalInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#475569',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  radioGroup: {
    gap: 8,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1976D2',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976D2',
  },
  radioLabel: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
    gap: 8,
  },
  datePickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  dateClearButton: {
    padding: 4,
  },
  // No actions state
  noActionsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActionsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  // Modal additional styles
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInfoSection: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
});
