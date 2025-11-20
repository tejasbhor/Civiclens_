import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { colors } from '@shared/theme/colors';

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RoleSelection'
>;

interface RoleSelectionScreenProps {
  navigation: RoleSelectionScreenNavigationProp;
  onSelectRole?: (role: 'citizen' | 'officer') => void;
}

export const RoleSelectionScreen = ({ navigation, onSelectRole }: RoleSelectionScreenProps) => {
  const handleSelectRole = (role: 'citizen' | 'officer') => {
    if (onSelectRole) {
      onSelectRole(role);
    } else {
      // Navigate to appropriate login screen
      if (role === 'citizen') {
        navigation.navigate('CitizenLogin');
      } else {
        navigation.navigate('OfficerLogin');
      }
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>CL</Text>
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>CivicLens</Text>
              <Text style={styles.heroSubtitle}>
                One platform for citizens & officers to collaborate on civic issues.
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.roleGrid}>
          <View style={styles.roleCard}>
            <View style={[styles.roleIcon, styles.roleIconPrimary]}> 
              <Ionicons name="people" size={28} color={colors.primaryDark} />
            </View>
            <Text style={styles.roleTitle}>Citizen</Text>
            <Text style={styles.roleDescription}>
              Submit reports, track progress, and validate nearby issues.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={() => handleSelectRole('citizen')}
            >
              <Text style={styles.primaryButtonText}>Continue as Citizen</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={[styles.roleCard, styles.roleCardLast]}>
            <View style={[styles.roleIcon, styles.roleIconSecondary]}> 
              <Ionicons name="shield-checkmark" size={28} color={colors.secondaryDark} />
            </View>
            <Text style={styles.roleTitle}>Nodal Officer</Text>
            <Text style={styles.roleDescription}>
              Manage assigned tasks, capture proofs, and update citizens.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.9}
              onPress={() => handleSelectRole('officer')}
            >
              <Text style={styles.secondaryButtonText}>Continue as Officer</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>
          Offline-first • Secure • Available in 6 languages
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoBadgeText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  roleGrid: {
    marginTop: 24,
  },
  roleCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  roleCardLast: {
    marginBottom: 0,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconPrimary: {
    backgroundColor: 'rgba(33,150,243,0.12)',
  },
  roleIconSecondary: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  roleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 8,
    flexGrow: 1,
  },
  primaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 16,
  },
});
