import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@shared/theme/colors';

const { width } = Dimensions.get('window');
const defaultHighlights = ['Offline-first ready', 'Secure OTP', 'Live task sync'];

interface SplashScreenProps {
  statusHeading?: string;
  statusMessage?: string;
  highlights?: string[];
  footerText?: string;
  footerSubtext?: string;
  isError?: boolean;
}

export const SplashScreen = ({
  statusHeading = 'Preparing CivicLens',
  statusMessage = 'Initializing secure storage, offline cache & sync',
  highlights = defaultHighlights,
  footerText = 'Offline-first • Multilingual • Secure',
  footerSubtext = 'v1.0 • Powered by CivicLens',
  isError = false,
}: SplashScreenProps) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const iconFadeAnim = useRef(new Animated.Value(0)).current;
  const chipStaggerAnim = useRef(highlights.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Stagger animation sequence for professional reveal
    const animations = [];

    // 1. Fade in logo container
    animations.push(
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    );

    // 2. Fade in icon with slight delay
    animations.push(
      Animated.timing(iconFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      })
    );

    // 3. Stagger chip animations
    const chipAnimations = chipStaggerAnim.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 600 + index * 100,
        useNativeDriver: true,
      })
    );

    // 4. Continuous pulse animation for logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // 5. Shimmer effect for progress bar
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    let progressAnimation: Animated.CompositeAnimation | undefined;

    if (!isError) {
      progressAnim.setValue(0);
      progressAnimation = Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: false,
      });
    }

    // Start all animations
    Animated.parallel([
      Animated.sequence(animations),
      Animated.parallel(chipAnimations),
    ]).start();

    if (!isError) {
      pulseAnimation.start();
      shimmerAnimation.start();
      progressAnimation?.start();
    }

    return () => {
      fadeAnim.stopAnimation();
      iconFadeAnim.stopAnimation();
      pulseAnim.stopAnimation();
      shimmerAnim.stopAnimation();
      chipStaggerAnim.forEach(anim => anim.stopAnimation());
      if (progressAnimation) {
        progressAnimation.stop();
      }
    };
  }, [fadeAnim, progressAnim, isError, pulseAnim, shimmerAnim, iconFadeAnim, chipStaggerAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Enhanced Logo */}
        <View style={styles.logoContainer}>
          <Animated.View 
            style={[
              styles.logoCircle,
              { 
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            {/* Outer glow ring */}
            <View style={styles.glowRing} />
            
            {/* Inner gradient circle */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View style={{ opacity: iconFadeAnim }}>
                <Ionicons name="shield-checkmark" size={64} color="#FFFFFF" />
              </Animated.View>
            </LinearGradient>
          </Animated.View>
          
          <Text style={styles.appName}>CivicLens</Text>
          <Text style={styles.tagline}>Citizen & Officer Collaboration Platform</Text>
        </View>

        <View style={styles.chipRow}>
          {highlights.map((highlight, index) => (
            <Animated.View 
              key={highlight} 
              style={[
                styles.highlightChip,
                {
                  opacity: chipStaggerAnim[index],
                  transform: [
                    {
                      translateY: chipStaggerAnim[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.highlightText}>✓ {highlight}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Loading Bar */}
        <View style={styles.loadingContainer}>
          <Text style={[styles.statusHeading, isError && styles.statusHeadingError]}>{statusHeading}</Text>
          {isError ? (
            <Text style={styles.errorMessage}>{statusMessage}</Text>
          ) : (
            <>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressWidth,
                    },
                  ]}
                >
                  {/* Shimmer effect on progress bar */}
                  <Animated.View
                    style={[
                      styles.shimmer,
                      {
                        transform: [{ translateX: shimmerTranslate }],
                      },
                    ]}
                  />
                </Animated.View>
              </View>
              <Text style={styles.loadingText}>{statusMessage}</Text>
            </>
          )}
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{footerText}</Text>
        <Text style={styles.versionText}>{footerSubtext}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 8,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  highlightChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    width: width - 80,
    alignItems: 'center',
  },
  statusHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusHeadingError: {
    color: '#FECACA',
  },
  progressBarBackground: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loadingText: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#FECACA',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
});
