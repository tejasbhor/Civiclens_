# Bottom Sheet Implementation Guide

## Required Changes

### 1. Install react-native-svg

```bash
npx expo install react-native-svg
```

### 2. Add Imports

```typescript
import Svg, { Circle } from 'react-native-svg';
import { Linking, Alert } from 'react-native';
```

### 3. Emergency Call Function

Add this function in the component:

```typescript
const handleEmergencyCall = () => {
  Alert.alert(
    'Emergency Services',
    'Choose an emergency service',
    [
      {
        text: 'Police (100)',
        onPress: () => Linking.openURL('tel:100'),
      },
      {
        text: 'Fire (101)',
        onPress: () => Linking.openURL('tel:101'),
      },
      {
        text: 'Ambulance (102)',
        onPress: () => Linking.openURL('tel:102'),
      },
      {
        text: 'Women Helpline (1091)',
        onPress: () => Linking.openURL('tel:1091'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};
```

### 4. Collapsed View (Only Button)

```typescript
{!isExpanded && (
  <View style={styles.collapsedView}>
    <TouchableOpacity 
      style={styles.reportButton} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate('SubmitReport')}
    >
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.reportButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.reportButtonText}>Report an Issue</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
)}
```

### 5. Expanded View with Segmented Circle

```typescript
{isExpanded && stats && (
  <ScrollView style={styles.scrollView}>
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        {/* Segmented Circle */}
        <View style={styles.chartSection}>
          <View style={styles.segmentedCircle}>
            <Svg width={140} height={140}>
              {/* Background */}
              <Circle cx={70} cy={70} r={55} stroke="#E0E0E0" strokeWidth={12} fill="none" />
              
              {/* Calculate segments */}
              {(() => {
                const total = stats.total || 1;
                const circumference = 2 * Math.PI * 55;
                
                const resolvedPercent = (stats.resolved / total) * 100;
                const progressPercent = (stats.inProgress / total) * 100;
                const raisedPercent = (stats.issuesRaised / total) * 100;
                
                const resolvedDash = (resolvedPercent / 100) * circumference;
                const progressDash = (progressPercent / 100) * circumference;
                const raisedDash = (raisedPercent / 100) * circumference;

                return (
                  <>
                    {/* Resolved (Green) */}
                    <Circle
                      cx={70} cy={70} r={55}
                      stroke="#4CAF50"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${resolvedDash} ${circumference}`}
                      strokeDashoffset={0}
                      rotation="-90"
                      origin="70, 70"
                      strokeLinecap="round"
                    />
                    
                    {/* In Progress (Orange) */}
                    <Circle
                      cx={70} cy={70} r={55}
                      stroke="#FF9800"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${progressDash} ${circumference}`}
                      strokeDashoffset={-resolvedDash}
                      rotation="-90"
                      origin="70, 70"
                      strokeLinecap="round"
                    />
                    
                    {/* Raised (Blue) */}
                    <Circle
                      cx={70} cy={70} r={55}
                      stroke="#2196F3"
                      strokeWidth={12}
                      fill="none"
                      strokeDasharray={`${raisedDash} ${circumference}`}
                      strokeDashoffset={-(resolvedDash + progressDash)}
                      rotation="-90"
                      origin="70, 70"
                      strokeLinecap="round"
                    />
                  </>
                );
              })()}
            </Svg>
            
            {/* Center Text */}
            <View style={styles.circleCenter}>
              <Text style={styles.circleTotalNumber}>{stats.total}</Text>
              <Text style={styles.circleTotalLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Stats Legend */}
        <View style={styles.statsLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendNumber}>{stats.issuesRaised}</Text>
            <Text style={styles.legendLabel}>Raised</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendNumber}>{stats.inProgress}</Text>
            <Text style={styles.legendLabel}>In Progress</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendNumber}>{stats.resolved}</Text>
            <Text style={styles.legendLabel}>Resolved</Text>
          </View>
        </View>
      </View>
    </View>

    {/* Report Button */}
    <TouchableOpacity 
      style={styles.primaryButton} 
      onPress={() => navigation.navigate('SubmitReport')}
    >
      <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.primaryButtonGradient}>
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.primaryButtonText}>Report an Issue</Text>
      </LinearGradient>
    </TouchableOpacity>

    {/* Quick Actions */}
    <View style={styles.quickActionsGrid}>
      <TouchableOpacity style={styles.quickActionCard} onPress={handleEmergencyCall}>
        <View style={[styles.quickActionIcon, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="call" size={28} color="#FFF" />
        </View>
        <Text style={styles.quickActionTitle}>Emergency</Text>
        <Text style={styles.quickActionSubtitle}>Call Now</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickActionCard}
        onPress={() => navigation.navigate('Reports', { screen: 'ReportsList' })}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: '#2196F3' }]}>
          <Ionicons name="bar-chart" size={28} color="#FFF" />
        </View>
        <Text style={styles.quickActionTitle}>Summary</Text>
        <Text style={styles.quickActionSubtitle}>View All</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
)}
```

### 6. Styles to Add

```typescript
// Collapsed View
collapsedView: {
  padding: 16,
},
reportButton: {
  borderRadius: 28,
  overflow: 'hidden',
  shadowColor: '#2196F3',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
},
reportButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 24,
  gap: 12,
},
reportButtonText: {
  fontSize: 18,
  fontWeight: '700',
  color: '#FFF',
},

// Segmented Circle
segmentedCircle: {
  width: 140,
  height: 140,
  justifyContent: 'center',
  alignItems: 'center',
},
circleCenter: {
  position: 'absolute',
  justifyContent: 'center',
  alignItems: 'center',
},
circleTotalNumber: {
  fontSize: 32,
  fontWeight: '700',
  color: '#1E293B',
},
circleTotalLabel: {
  fontSize: 12,
  color: '#64748B',
  marginTop: 4,
},

// Legend
statsLegend: {
  flex: 1,
  justifyContent: 'space-around',
  paddingLeft: 20,
},
legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
legendDot: {
  width: 12,
  height: 12,
  borderRadius: 6,
},
legendNumber: {
  fontSize: 20,
  fontWeight: '700',
  color: '#1E293B',
  minWidth: 30,
},
legendLabel: {
  fontSize: 14,
  color: '#64748B',
},

// Quick Actions
quickActionsGrid: {
  flexDirection: 'row',
  gap: 12,
  paddingHorizontal: 16,
  marginTop: 16,
  marginBottom: 20,
},
quickActionCard: {
  flex: 1,
  backgroundColor: '#F8FAFC',
  borderRadius: 16,
  padding: 20,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
quickActionIcon: {
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},
quickActionTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#1E293B',
  marginBottom: 4,
},
quickActionSubtitle: {
  fontSize: 12,
  color: '#64748B',
},
```

## Result

- ✅ Collapsed: Only "Report an Issue" button
- ✅ Expanded: Segmented circle showing status breakdown
- ✅ Emergency Call: Shows options and dials directly
- ✅ Summary Report: Navigates to reports list
- ✅ Production-ready design
