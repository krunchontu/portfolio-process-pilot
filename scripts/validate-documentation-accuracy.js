#!/usr/bin/env node

/**
 * Documentation Accuracy Validation Script
 * 
 * Validates that documentation claims align with actual code implementation
 * Flags outdated security claims and false completion percentages
 */

const fs = require('fs')
const path = require('path')

class DocumentationValidator {
  constructor() {
    this.errors = []
    this.warnings = []
    this.projectRoot = path.resolve(__dirname, '..')
  }

  // Check for localStorage usage in frontend (indicates security vulnerability)
  async checkAuthenticationSecurity() {
    const frontendDir = path.join(this.projectRoot, 'frontend', 'src')
    let hasLocalStorageTokens = false

    // Simple recursive file search
    const searchFiles = (dir) => {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          searchFiles(filePath)
        } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
          const content = fs.readFileSync(filePath, 'utf8')
          
          if (content.includes('localStorage.setItem') && 
              (content.includes('token') || content.includes('auth'))) {
            hasLocalStorageTokens = true
            this.errors.push({
              type: 'CRITICAL_SECURITY',
              file: path.relative(this.projectRoot, filePath),
              issue: 'Frontend still uses localStorage for authentication tokens (XSS vulnerability)'
            })
          }
        }
      }
    }

    if (fs.existsSync(frontendDir)) {
      searchFiles(frontendDir)
    }

    return !hasLocalStorageTokens
  }

  // Validate documentation claims against actual security status
  async validateSecurityClaims() {
    const isSecure = await this.checkAuthenticationSecurity()
    
    // Check documentation files for false security claims
    const docFiles = [
      'TODO_CHECKLIST.md',
      'PROJECT_STATUS.md', 
      'ProcessPilot-Brownfield-PRD.md',
      'docs/architecture.md'
    ]

    for (const docFile of docFiles) {
      const filePath = path.join(this.projectRoot, docFile)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, 'utf8')

      // Flag false completion claims if security vulnerability exists
      if (!isSecure) {
        if (content.includes('✅') && 
            content.includes('localStorage') && 
            content.includes('httpOnly cookies')) {
          this.errors.push({
            type: 'FALSE_COMPLETION_CLAIM',
            file: docFile,
            issue: 'Claims localStorage to httpOnly cookie migration complete while vulnerability exists'
          })
        }

        if (content.includes('PRODUCTION-READY') || 
            content.includes('production-ready')) {
          this.warnings.push({
            type: 'PREMATURE_PRODUCTION_CLAIM',
            file: docFile,
            issue: 'Claims production readiness while critical security vulnerability exists'
          })
        }

        if (content.includes('94%') && content.includes('complete')) {
          this.warnings.push({
            type: 'INFLATED_COMPLETION_PERCENTAGE',
            file: docFile,
            issue: 'Completion percentage may be inflated due to unresolved critical security issue'
          })
        }
      }
    }
  }

  // Check consistency across documentation files
  async validateConsistency() {
    const statusFiles = [
      'TODO_CHECKLIST.md',
      'PROJECT_STATUS.md'
    ]

    const completionPercentages = []

    for (const file of statusFiles) {
      const filePath = path.join(this.projectRoot, file)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, 'utf8')
      const percentageMatch = content.match(/(\d+)%/)
      
      if (percentageMatch) {
        completionPercentages.push({
          file,
          percentage: parseInt(percentageMatch[1])
        })
      }
    }

    // Check for inconsistent completion percentages
    const uniquePercentages = [...new Set(completionPercentages.map(p => p.percentage))]
    if (uniquePercentages.length > 1) {
      this.warnings.push({
        type: 'INCONSISTENT_COMPLETION',
        issue: `Inconsistent completion percentages: ${completionPercentages.map(p => `${p.file}: ${p.percentage}%`).join(', ')}`
      })
    }
  }

  // Validate that critical security issues are not marked complete
  async validateCriticalIssueStatus() {
    const todoFile = path.join(this.projectRoot, 'TODO_CHECKLIST.md')
    if (!fs.existsSync(todoFile)) return

    const content = fs.readFileSync(todoFile, 'utf8')
    
    // Check if localStorage migration is marked complete
    const localStorageRegex = /\[x\].*localStorage.*httpOnly/i
    if (localStorageRegex.test(content)) {
      const isSecure = await this.checkAuthenticationSecurity()
      if (!isSecure) {
        this.errors.push({
          type: 'CRITICAL_FALSE_COMPLETION',
          file: 'TODO_CHECKLIST.md',
          issue: 'localStorage to httpOnly migration marked complete but vulnerability still exists'
        })
      }
    }
  }

  // Generate validation report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? 'PASS' : 'FAIL'
      },
      errors: this.errors,
      warnings: this.warnings
    }

    return report
  }

  // Run all validation checks
  async validate() {
    console.log('🔍 Running documentation accuracy validation...')
    
    await this.checkAuthenticationSecurity()
    await this.validateSecurityClaims()
    await this.validateConsistency()
    await this.validateCriticalIssueStatus()

    const report = this.generateReport()

    // Output results
    console.log(`\n📊 Validation Results:`)
    console.log(`   Errors: ${report.summary.errors}`)
    console.log(`   Warnings: ${report.summary.warnings}`)
    console.log(`   Status: ${report.summary.status}`)

    if (report.errors.length > 0) {
      console.log('\n🚨 Critical Documentation Errors:')
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.file || 'General'}: ${error.issue}`)
      })
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️  Documentation Warnings:')
      report.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type}] ${warning.file || 'General'}: ${warning.issue}`)
      })
    }

    // Write detailed report
    const reportPath = path.join(this.projectRoot, '.ai/documentation-validation-report.json')
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📝 Detailed report saved to: ${reportPath}`)

    // Exit with error code if validation fails
    if (report.summary.status === 'FAIL') {
      process.exit(1)
    }

    console.log('\n✅ Documentation accuracy validation complete')
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DocumentationValidator()
  validator.validate().catch(error => {
    console.error('💥 Validation failed:', error.message)
    process.exit(1)
  })
}

module.exports = DocumentationValidator