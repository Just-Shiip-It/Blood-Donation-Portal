import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSystem, appointmentFilters, bloodRequestFilters, donationFilters } from '../filter-system'

describe('FilterSystem', () => {
    const mockOnChange = vi.fn()
    const mockOnClear = vi.fn()

    const defaultProps = {
        filters: appointmentFilters,
        values: {},
        onChange: mockOnChange,
        onClear: mockOnClear,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders filter header', () => {
        render(<FilterSystem {...defaultProps} />)

        expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('shows filter count when filters are active', () => {
        const values = {
            status: 'scheduled',
            bloodType: 'O+',
        }

        render(<FilterSystem {...defaultProps} values={values} showFilterCount={true} />)

        expect(screen.getByText('2')).toBeInTheDocument() // Badge showing count
    })

    it('displays active filters as badges', () => {
        const values = {
            status: 'scheduled',
            bloodType: 'O+',
        }

        render(<FilterSystem {...defaultProps} values={values} showActiveFilters={true} />)

        expect(screen.getByText(/Status: scheduled/i)).toBeInTheDocument()
        expect(screen.getByText(/Blood Type: O\+/i)).toBeInTheDocument()
    })

    it('calls onClear when clear all button is clicked', async () => {
        const user = userEvent.setup()
        const values = { status: 'scheduled' }

        render(<FilterSystem {...defaultProps} values={values} />)

        const clearButton = screen.getByRole('button', { name: /clear all/i })
        await user.click(clearButton)

        expect(mockOnClear).toHaveBeenCalled()
    })

    it('handles select filter changes', async () => {
        const user = userEvent.setup()
        render(<FilterSystem {...defaultProps} />)

        // Find status select (first filter in appointmentFilters)
        const statusSelect = screen.getByRole('combobox', { name: /status/i })
        await user.click(statusSelect)

        // Select 'completed' option
        const completedOption = screen.getByRole('option', { name: /completed/i })
        await user.click(completedOption)

        expect(mockOnChange).toHaveBeenCalledWith({
            status: 'completed',
        })
    })

    it('handles text filter changes', async () => {
        const user = userEvent.setup()
        const filtersWithText = [
            {
                key: 'location',
                label: 'Location',
                type: 'text' as const,
                placeholder: 'Enter location',
            },
        ]

        render(<FilterSystem {...defaultProps} filters={filtersWithText} />)

        const locationInput = screen.getByPlaceholderText(/enter location/i)
        await user.type(locationInput, 'New York')

        expect(mockOnChange).toHaveBeenCalledWith({
            location: 'New York',
        })
    })

    it('handles date range filter changes', async () => {
        const user = userEvent.setup()
        const filtersWithDateRange = [
            {
                key: 'dateRange',
                label: 'Date Range',
                type: 'daterange' as const,
            },
        ]

        render(<FilterSystem {...defaultProps} filters={filtersWithDateRange} />)

        const fromDateInput = screen.getByPlaceholderText(/from date/i)
        const toDateInput = screen.getByPlaceholderText(/to date/i)

        await user.type(fromDateInput, '2024-01-01')
        await user.type(toDateInput, '2024-12-31')

        expect(mockOnChange).toHaveBeenCalledWith({
            dateRange: {
                from: '2024-01-01',
                to: '2024-12-31',
            },
        })
    })

    it('handles multiselect filter changes', async () => {
        const user = userEvent.setup()
        const filtersWithMultiselect = [
            {
                key: 'bloodTypes',
                label: 'Blood Types',
                type: 'multiselect' as const,
                options: [
                    { value: 'A+', label: 'A+' },
                    { value: 'B+', label: 'B+' },
                    { value: 'O+', label: 'O+' },
                ],
            },
        ]

        render(<FilterSystem {...defaultProps} filters={filtersWithMultiselect} />)

        // Click multiselect dropdown
        const multiselectButton = screen.getByRole('button', { name: /select blood types/i })
        await user.click(multiselectButton)

        // Select multiple options
        const aPlusOption = screen.getByRole('menuitemcheckbox', { name: 'A+' })
        const bPlusOption = screen.getByRole('menuitemcheckbox', { name: 'B+' })

        await user.click(aPlusOption)
        await user.click(bPlusOption)

        expect(mockOnChange).toHaveBeenCalledWith({
            bloodTypes: ['A+', 'B+'],
        })
    })

    it('removes individual active filters', async () => {
        const user = userEvent.setup()
        const values = {
            status: 'scheduled',
            bloodType: 'O+',
        }

        render(<FilterSystem {...defaultProps} values={values} showActiveFilters={true} />)

        // Find and click the remove button for status filter
        const statusBadge = screen.getByText(/Status: scheduled/i).closest('.flex')
        const removeButton = statusBadge?.querySelector('button')

        if (removeButton) {
            await user.click(removeButton)
        }

        expect(mockOnChange).toHaveBeenCalledWith({
            bloodType: 'O+',
        })
    })

    it('toggles compact mode', async () => {
        const user = userEvent.setup()
        render(<FilterSystem {...defaultProps} compactMode={true} />)

        // In compact mode, filters should be collapsed initially
        expect(screen.queryByText(/Status/i)).not.toBeInTheDocument()

        // Click expand button
        const expandButton = screen.getByRole('button')
        await user.click(expandButton)

        // Now filters should be visible
        expect(screen.getByText(/Status/i)).toBeInTheDocument()
    })

    it('works with appointment filters', () => {
        render(<FilterSystem {...defaultProps} filters={appointmentFilters} />)

        expect(screen.getByText(/Status/i)).toBeInTheDocument()
        expect(screen.getByText(/Blood Type/i)).toBeInTheDocument()
        expect(screen.getByText(/Date Range/i)).toBeInTheDocument()
        expect(screen.getByText(/Location/i)).toBeInTheDocument()
    })

    it('works with blood request filters', () => {
        render(<FilterSystem {...defaultProps} filters={bloodRequestFilters} />)

        expect(screen.getByText(/Status/i)).toBeInTheDocument()
        expect(screen.getByText(/Urgency/i)).toBeInTheDocument()
        expect(screen.getByText(/Blood Type/i)).toBeInTheDocument()
        expect(screen.getByText(/Request Date/i)).toBeInTheDocument()
    })

    it('works with donation filters', () => {
        render(<FilterSystem {...defaultProps} filters={donationFilters} />)

        expect(screen.getByText(/Blood Type/i)).toBeInTheDocument()
        expect(screen.getByText(/Donation Date/i)).toBeInTheDocument()
        expect(screen.getByText(/Blood Bank/i)).toBeInTheDocument()
    })

    it('handles empty filter values correctly', () => {
        const values = {
            status: '',
            bloodType: null,
            dateRange: {},
            multiselect: [],
        }

        render(<FilterSystem {...defaultProps} values={values} showActiveFilters={true} />)

        // Should not show any active filter badges for empty values
        expect(screen.queryByText(/Status:/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Blood Type:/i)).not.toBeInTheDocument()
    })

    it('formats multiselect display values correctly', () => {
        const values = {
            bloodTypes: ['A+', 'B+', 'O+'],
        }

        const filtersWithMultiselect = [
            {
                key: 'bloodTypes',
                label: 'Blood Types',
                type: 'multiselect' as const,
                options: [
                    { value: 'A+', label: 'A+' },
                    { value: 'B+', label: 'B+' },
                    { value: 'O+', label: 'O+' },
                ],
            },
        ]

        render(
            <FilterSystem
                {...defaultProps}
                filters={filtersWithMultiselect}
                values={values}
                showActiveFilters={true}
            />
        )

        expect(screen.getByText(/Blood Types: A\+, B\+, O\+/i)).toBeInTheDocument()
    })

    it('formats date range display values correctly', () => {
        const values = {
            dateRange: {
                from: '2024-01-01',
                to: '2024-12-31',
            },
        }

        const filtersWithDateRange = [
            {
                key: 'dateRange',
                label: 'Date Range',
                type: 'daterange' as const,
            },
        ]

        render(
            <FilterSystem
                {...defaultProps}
                filters={filtersWithDateRange}
                values={values}
                showActiveFilters={true}
            />
        )

        expect(screen.getByText(/Date Range: 2024-01-01 - 2024-12-31/i)).toBeInTheDocument()
    })
})