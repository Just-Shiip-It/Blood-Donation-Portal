#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner
 * 
 * This script runs all test suites in the correct order and provides
 * detailed reporting on test results, coverage, and performance metrics.
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TestSuite {
    name: string
    command: string
    timeout: number
    critical: boolean
    description: string
}

interface TestResult {
    suite: string
    success: boolean
    duration: number
    output: string
    error?: string
}

class TestRunner {
    private results: TestResult[] = []
    private startTime: number = 0
    private reportDir: string

    constructor() {
        this.reportDir = join(process.cwd(), 'test-reports')
        this.ensureReportDirectory()
    }

    private ensureReportDirectory() {
        if (!existsSync(this.reportDir)) {
            mkdirSync(this.reportDir, { recursive: true })
        }
    }

    private async runCommand(command: string, timeout: number): Promise<{ success: boolean; output: string; error?: string }> {
        return new Promise((resolve) => {
            try {
                const output = execSync(command, {
                    encoding: 'utf8',
                    timeout: timeout * 1000,
                    stdio: 'pipe'
                })
                resolve({ success: true, output })
            } catch (error: any) {
                resolve({
                    success: false,
                    output: error.stdout || '',
                    error: error.stderr || error.message
                })
            }
        })
    }

    private async runTestSuite(suite: TestSuite): Promise<TestResult> {
        console.log(`\n🧪 Running ${suite.name}...`)
        console.log(`   ${suite.description}`)

        const startTime = Date.now()
        const result = await this.runCommand(suite.command, suite.timeout)
        const duration = Date.now() - startTime

        const testResult: TestResult = {
            suite: suite.name,
            success: result.success,
            duration,
            output: result.output,
            error: result.error
        }

        if (result.success) {
            console.log(`   ✅ ${suite.name} passed (${duration}ms)`)
        } else {
            console.log(`   ❌ ${suite.name} failed (${duration}ms)`)
            if (result.error) {
                console.log(`   Error: ${result.error.substring(0, 200)}...`)
            }
        }

        return testResult
    }

    private generateReport() {
        const totalDuration = Date.now() - this.startTime
        const passedTests = this.results.filter(r => r.success).length
        const failedTests = this.results.length - passedTests
        const successRate = (passedTests / this.results.length) * 100

        const report = {
            summary: {
                totalSuites: this.results.length,
                passed: passedTests,
                failed: failedTests,
                successRate: Math.round(successRate * 100) / 100,
                totalDuration,
                timestamp: new Date().toISOString()
            },
            results: this.results,
            details: this.results.map(result => ({
                suite: result.suite,
                success: result.success,
                duration: result.duration,
                hasOutput: result.output.length > 0,
                hasError: !!result.error
            }))
        }

        // Write JSON report
        writeFileSync(
            join(this.reportDir, 'test-results.json'),
            JSON.stringify(report, null, 2)
        )

        // Write HTML report
        this.generateHtmlReport(report)

        return report
    }

    private generateHtmlReport(report: any) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Blood Donation Portal - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; font-size: 0.9em; }
        .test-results { margin-top: 30px; }
        .test-item { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-item.success { border-left: 4px solid #10b981; }
        .test-item.failure { border-left: 4px solid #ef4444; }
        .test-name { font-weight: bold; font-size: 1.1em; }
        .test-duration { color: #6b7280; font-size: 0.9em; }
        .error-details { background: #fef2f2; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.8em; }
        .success-rate { color: ${report.summary.successRate === 100 ? '#10b981' : report.summary.successRate >= 80 ? '#f59e0b' : '#ef4444'}; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Blood Donation Portal - Test Results</h1>
        <p>Generated on ${new Date(report.summary.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${report.summary.totalSuites}</div>
            <div class="metric-label">Total Test Suites</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #10b981;">${report.summary.passed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #ef4444;">${report.summary.failed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value success-rate">${report.summary.successRate}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${Math.round(report.summary.totalDuration / 1000)}s</div>
            <div class="metric-label">Total Duration</div>
        </div>
    </div>

    <div class="test-results">
        <h2>Test Suite Results</h2>
        ${report.results.map((result: TestResult) => `
            <div class="test-item ${result.success ? 'success' : 'failure'}">
                <div class="test-name">${result.suite}</div>
                <div class="test-duration">Duration: ${result.duration}ms</div>
                ${result.error ? `<div class="error-details">${result.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`

        writeFileSync(join(this.reportDir, 'test-results.html'), html)
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive test suite for Blood Donation Portal')
        console.log('='.repeat(60))

        this.startTime = Date.now()

        const testSuites: TestSuite[] = [
            {
                name: 'Environment Setup',
                command: 'npm run db:push && npm run db:seed',
                timeout: 60,
                critical: true,
                description: 'Setting up test database and seeding initial data'
            },
            {
                name: 'Unit Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/appointment-service.test.ts src/test/mobile-pwa.test.ts',
                timeout: 120,
                critical: true,
                description: 'Running unit tests for core business logic'
            },
            {
                name: 'Database Integration Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/integration/database.test.ts',
                timeout: 180,
                critical: true,
                description: 'Testing database operations and data integrity'
            },
            {
                name: 'Authentication API Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/integration/auth.api.test.ts',
                timeout: 120,
                critical: true,
                description: 'Testing authentication endpoints and security'
            },
            {
                name: 'Appointments API Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/integration/appointments.api.test.ts',
                timeout: 180,
                critical: true,
                description: 'Testing appointment booking and management APIs'
            },
            {
                name: 'Blood Requests API Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/integration/blood-requests.api.test.ts',
                timeout: 180,
                critical: true,
                description: 'Testing blood request creation and fulfillment APIs'
            },
            {
                name: 'API Documentation Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/api-docs/api-documentation.test.ts',
                timeout: 120,
                critical: false,
                description: 'Validating API contracts and response formats'
            },
            {
                name: 'Donor Journey E2E Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/e2e/donor-journey.test.ts',
                timeout: 300,
                critical: true,
                description: 'Testing complete donor user journeys end-to-end'
            },
            {
                name: 'Facility Journey E2E Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/e2e/facility-journey.test.ts',
                timeout: 300,
                critical: true,
                description: 'Testing complete healthcare facility user journeys'
            },
            {
                name: 'Performance Tests',
                command: 'npm run test:run -- --reporter=verbose src/test/performance/api-performance.test.ts',
                timeout: 600,
                critical: false,
                description: 'Testing API performance and response times'
            },
            {
                name: 'Test Coverage Report',
                command: 'npm run test:coverage',
                timeout: 180,
                critical: false,
                description: 'Generating comprehensive test coverage report'
            }
        ]

        // Run all test suites
        for (const suite of testSuites) {
            const result = await this.runTestSuite(suite)
            this.results.push(result)

            // Stop on critical test failure
            if (!result.success && suite.critical) {
                console.log(`\n💥 Critical test suite "${suite.name}" failed. Stopping execution.`)
                break
            }
        }

        // Generate reports
        console.log('\n📊 Generating test reports...')
        const report = this.generateReport()

        // Print summary
        console.log('\n' + '='.repeat(60))
        console.log('📋 TEST SUMMARY')
        console.log('='.repeat(60))
        console.log(`Total Suites: ${report.summary.totalSuites}`)
        console.log(`Passed: ${report.summary.passed}`)
        console.log(`Failed: ${report.summary.failed}`)
        console.log(`Success Rate: ${report.summary.successRate}%`)
        console.log(`Total Duration: ${Math.round(report.summary.totalDuration / 1000)}s`)
        console.log(`\nReports generated in: ${this.reportDir}`)

        // Exit with appropriate code
        const hasFailures = report.summary.failed > 0
        if (hasFailures) {
            console.log('\n❌ Some tests failed. Check the reports for details.')
            process.exit(1)
        } else {
            console.log('\n✅ All tests passed successfully!')
            process.exit(0)
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new TestRunner()
    runner.runAllTests().catch((error) => {
        console.error('Test runner failed:', error)
        process.exit(1)
    })
}

export { TestRunner }