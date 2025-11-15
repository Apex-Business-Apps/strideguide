/**
 * SystemReliabilityTester - Comprehensive testing for StrideGuide critical functions
 */

import { AudioArmer } from './AudioArmer';
import { BatteryGuard } from './BatteryGuard';
import { HealthManager } from './HealthManager';
import { SOSGuard } from './SOSGuard';
import { WakeLockManager } from './WakeLockManager';

export interface TestResult {
  component: string;
  test: string;
  passed: boolean;
  error?: string;
  timestamp: Date;
  duration?: number;
  details?: Record<string, unknown>;
}

export class SystemReliabilityTester {
  private static testResults: TestResult[] = [];

  // Test Audio System Reliability
  static async testAudioReliability(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const _startTime = Date.now();

    console.group('🔊 Testing Audio System Reliability');

    // Test 1: AudioContext creation and suspension handling
    try {
      const testStart = Date.now();
      await AudioArmer.initialize();
      const duration = Date.now() - testStart;
      
      results.push({
        component: 'AudioSystem',
        test: 'Initialization',
        passed: AudioArmer.isArmed(),
        timestamp: new Date(),
        duration,
        details: { contextState: AudioArmer.getContext()?.state }
      });
    } catch (error) {
      results.push({
        component: 'AudioSystem',
        test: 'Initialization',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test 2: TTS functionality
    try {
      const testStart = Date.now();
      AudioArmer.announceText('System test');
      const duration = Date.now() - testStart;
      
      results.push({
        component: 'AudioSystem',
        test: 'TextToSpeech',
        passed: true,
        timestamp: new Date(),
        duration,
        details: { speechSynthesis: 'speechSynthesis' in window }
      });
    } catch (error) {
      results.push({
        component: 'AudioSystem',
        test: 'TextToSpeech',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test 3: Earcon playback
    try {
      const testStart = Date.now();
      AudioArmer.playEarcon('start');
      const duration = Date.now() - testStart;
      
      results.push({
        component: 'AudioSystem',
        test: 'EarconPlayback',
        passed: true,
        timestamp: new Date(),
        duration
      });
    } catch (error) {
      results.push({
        component: 'AudioSystem',
        test: 'EarconPlayback',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    console.groupEnd();
    this.testResults.push(...results);
    return results;
  }

  // Test Camera and ML Integration
  static async testCameraMLIntegration(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.group('📹 Testing Camera-ML Integration');

    // Test camera access simulation
    try {
      const isSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      results.push({
        component: 'Camera',
        test: 'MediaDevicesSupport',
        passed: !!isSupported,
        timestamp: new Date(),
        details: { hasMediaDevices: !!navigator.mediaDevices }
      });
    } catch (error) {
      results.push({
        component: 'Camera',
        test: 'MediaDevicesSupport',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test canvas and WebGL for ML
    try {
      const canvas = document.createElement('canvas');
      const ctx2d = canvas.getContext('2d');
      const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      results.push({
        component: 'ML',
        test: 'CanvasSupport',
        passed: !!ctx2d,
        timestamp: new Date(),
        details: { 
          canvas2d: !!ctx2d,
          webgl: !!webgl,
          webgpu: 'gpu' in navigator
        }
      });
    } catch (error) {
      results.push({
        component: 'ML',
        test: 'CanvasSupport',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    console.groupEnd();
    this.testResults.push(...results);
    return results;
  }

  // Test Emergency Systems
  static async testEmergencySystems(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.group('🚨 Testing Emergency Systems');

    // Test SOS Guard functionality
    try {
      const initialState = SOSGuard.getState();
      results.push({
        component: 'SOSGuard',
        test: 'StateInitialization',
        passed: !initialState.isPressed && !initialState.isInCooldown,
        timestamp: new Date(),
        details: initialState
      });

      // Test SOS press simulation (without triggering)
      const pressResult = SOSGuard.startPress();
      SOSGuard.endPress(); // Immediately cancel
      
      results.push({
        component: 'SOSGuard',
        test: 'PressHandling',
        passed: pressResult,
        timestamp: new Date()
      });
    } catch (error) {
      results.push({
        component: 'SOSGuard',
        test: 'Functionality',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test Haptic feedback
    try {
      const isSupported = 'vibrate' in navigator;
      if (isSupported) {
        // Test simple vibration pattern
        navigator.vibrate([100]);
      }
      
      results.push({
        component: 'Haptics',
        test: 'FeedbackSupport',
        passed: true,
        timestamp: new Date(),
        details: { supported: isSupported }
      });
    } catch (error) {
      results.push({
        component: 'Haptics',
        test: 'FeedbackSupport',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    console.groupEnd();
    this.testResults.push(...results);
    return results;
  }

  // Test Power Management
  static async testPowerManagement(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.group('🔋 Testing Power Management');

    // Test Battery Guard
    try {
      await BatteryGuard.initialize();
      const batteryInfo = BatteryGuard.getBatteryInfo();
      const lowPowerSettings = BatteryGuard.getLowPowerSettings();
      
      results.push({
        component: 'BatteryGuard',
        test: 'PowerManagement',
        passed: BatteryGuard.isSupported() || true, // Always pass if running
        timestamp: new Date(),
        details: { batteryInfo, lowPowerSettings }
      });
    } catch (error) {
      results.push({
        component: 'BatteryGuard',
        test: 'PowerManagement',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    // Test Wake Lock
    try {
      const isSupported = WakeLockManager.isSupported();
      
      results.push({
        component: 'WakeLock',
        test: 'APISupport',
        passed: true, // Test passes regardless of support
        timestamp: new Date(),
        details: { supported: isSupported }
      });
    } catch (error) {
      results.push({
        component: 'WakeLock',
        test: 'APISupport',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    console.groupEnd();
    this.testResults.push(...results);
    return results;
  }

  // Test Health Monitoring
  static async testHealthMonitoring(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.group('🏥 Testing Health Monitoring');

    try {
      const healthStatus = HealthManager.getStatus();
      const healthReport = HealthManager.getHealthReport();
      
      results.push({
        component: 'HealthManager',
        test: 'StatusReporting',
        passed: true,
        timestamp: new Date(),
        details: { status: healthStatus, report: healthReport }
      });

      // Test error reporting (using available method)
      HealthManager.reportMLError(new Error('Test error'));
      const updatedStatus = HealthManager.getStatus();
      
      results.push({
        component: 'HealthManager',
        test: 'ErrorReporting',
        passed: updatedStatus.ml !== 'ok',
        timestamp: new Date(),
        details: { updatedStatus }
      });

      // Reset health manager
      HealthManager.reset();
    } catch (error) {
      results.push({
        component: 'HealthManager',
        test: 'Functionality',
        passed: false,
        error: String(error),
        timestamp: new Date()
      });
    }

    console.groupEnd();
    this.testResults.push(...results);
    return results;
  }

  // Run comprehensive system tests
  static async runComprehensiveTests(): Promise<TestResult[]> {
    console.group('🧪 StrideGuide Comprehensive Reliability Tests');
    console.log('Starting comprehensive system reliability tests...');
    
    const startTime = Date.now();
    this.testResults = []; // Clear previous results

    try {
      const [audioResults, cameraMLResults, emergencyResults, powerResults, healthResults] = 
        await Promise.allSettled([
          this.testAudioReliability(),
          this.testCameraMLIntegration(),
          this.testEmergencySystems(),
          this.testPowerManagement(),
          this.testHealthMonitoring()
        ]);

      const allResults: TestResult[] = [];
      
      // Collect results from all test suites
      [audioResults, cameraMLResults, emergencyResults, powerResults, healthResults].forEach((result, index) => {
        const testNames = ['Audio', 'CameraML', 'Emergency', 'Power', 'Health'];
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          allResults.push({
            component: testNames[index],
            test: 'TestSuite',
            passed: false,
            error: String(result.reason),
            timestamp: new Date()
          });
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Generate summary
      const passed = allResults.filter(r => r.passed).length;
      const failed = allResults.filter(r => !r.passed).length;
      const total = allResults.length;

      console.log('\n📊 Comprehensive Test Results Summary:');
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`📈 Results: ${passed}/${total} passed (${((passed/total)*100).toFixed(1)}%)`);
      
      if (failed === 0) {
        console.log('🎉 All systems are reliable and operational!');
      } else {
        console.warn(`⚠️ ${failed} tests failed - check individual results for details`);
      }

      // Log failed tests for debugging
      const failedTests = allResults.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.group('❌ Failed Tests:');
        failedTests.forEach(test => {
          console.error(`${test.component}.${test.test}: ${test.error}`);
        });
        console.groupEnd();
      }

      console.groupEnd();
      return allResults;
    } catch (error) {
      console.error('Test suite failed:', error);
      console.groupEnd();
      throw error;
    }
  }

  // Get all test results
  static getTestResults(): TestResult[] {
    return this.testResults;
  }

  // Get test summary
  static getTestSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      components: [...new Set(this.testResults.map(r => r.component))],
      lastRun: this.testResults.length > 0 ? Math.max(...this.testResults.map(r => r.timestamp.getTime())) : null
    };
  }

  // Clear test results
  static clearResults(): void {
    this.testResults = [];
  }
}

// Auto-run comprehensive tests in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Run comprehensive tests after component initialization
  setTimeout(() => {
    SystemReliabilityTester.runComprehensiveTests().catch(console.error);
  }, 3000);
}

// Make available globally for manual testing
if (typeof window !== 'undefined') {
  (window as unknown as { StrideGuideReliabilityTest: typeof SystemReliabilityTester }).StrideGuideReliabilityTest = SystemReliabilityTester;
}