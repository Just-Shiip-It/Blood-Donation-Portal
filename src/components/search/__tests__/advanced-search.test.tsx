import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvancedSearch, SearchCriteria } from '../advanced-search'

describe('AdvancedSearch', () => {
    const mockOnSearch = vi.fn()
    const mockOnClear = vi.fn()
    const mockOnSaveSearch = vi.fn()
    const mockOnLoadSearch = vi.fn()

    const defaultProps = {
        onSearch: mockOnSearch,
        onClear: mockOnClear,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders basic search input', () => {
        render(<AdvancedSearch {...defaultProps} />)

        expect(screen.getByPlaceholderText(/search for appointments/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('calls onSearch when form is submitted', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText(/search for appointments/i)
        const searchButton = screen.getByRole('button', { name: /search/i })

        await user.type(searchInput, 'blood donation')
        await user.click(searchButton)

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith({
                query: 'blood donation',
            })
        })
    })

    it('shows advanced filters when expanded', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showCategory={true} />)

        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        expect(screen.getByText(/category/i)).toBeInTheDocument()
        expect(screen.getByText(/apply filters/i)).toBeInTheDocument()
    })

    it('handles blood type filter selection', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showBloodType={true} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Find and click blood type select
        const bloodTypeSelect = screen.getByRole('combobox', { name: /blood type/i })
        await user.click(bloodTypeSelect)

        // Select O+ blood type
        const oPlusOption = screen.getByRole('option', { name: 'O+' })
        await user.click(oPlusOption)

        // Submit the form
        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith({
                bloodType: 'O+',
            })
        })
    })

    it('handles location search input', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showLocationSearch={true} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Find location input
        const locationInput = screen.getByPlaceholderText(/enter city, state/i)
        await user.type(locationInput, 'New York, NY')

        // Submit the form
        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith({
                location: 'New York, NY',
            })
        })
    })

    it('handles date range selection', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showDateRange={true} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Find date inputs
        const fromDateInput = screen.getByPlaceholderText(/from date/i)
        const toDateInput = screen.getByPlaceholderText(/to date/i)

        await user.type(fromDateInput, '2024-01-01')
        await user.type(toDateInput, '2024-12-31')

        // Submit the form
        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith({
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31',
            })
        })
    })

    it('calls onClear when clear button is clicked', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Click clear button
        const clearButton = screen.getByRole('button', { name: /clear all/i })
        await user.click(clearButton)

        expect(mockOnClear).toHaveBeenCalled()
    })

    it('displays active filters', async () => {
        const user = userEvent.setup()
        const initialCriteria: SearchCriteria = {
            query: 'test search',
            bloodType: 'A+',
            status: 'scheduled',
        }

        render(<AdvancedSearch {...defaultProps} initialCriteria={initialCriteria} />)

        // Should show active filters count (bloodType and status, excluding query)
        expect(screen.getByText(/2 filter/i)).toBeInTheDocument()

        // Expand to see filter details
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Should show active filter badges
        expect(screen.getByText(/bloodType: A\+/i)).toBeInTheDocument()
        expect(screen.getByText(/status: scheduled/i)).toBeInTheDocument()
    })

    it('handles saved searches', async () => {
        const user = userEvent.setup()
        const savedSearches = [
            {
                id: '1',
                name: 'My Saved Search',
                criteria: { query: 'test', bloodType: 'O+' },
                createdAt: new Date(),
            },
        ]

        render(
            <AdvancedSearch
                {...defaultProps}
                savedSearches={savedSearches}
                onLoadSearch={mockOnLoadSearch}
            />
        )

        // Should display saved search
        expect(screen.getByText('My Saved Search')).toBeInTheDocument()

        // Click on saved search
        const savedSearchButton = screen.getByRole('button', { name: 'My Saved Search' })
        await user.click(savedSearchButton)

        expect(mockOnLoadSearch).toHaveBeenCalledWith({
            query: 'test',
            bloodType: 'O+',
        })
    })

    it('handles save search functionality', async () => {
        const user = userEvent.setup()

        // Mock window.prompt
        const mockPrompt = vi.fn().mockReturnValue('New Search Name')
        vi.stubGlobal('prompt', mockPrompt)

        render(<AdvancedSearch {...defaultProps} onSaveSearch={mockOnSaveSearch} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Add some search criteria
        const searchInput = screen.getByPlaceholderText(/search for appointments/i)
        await user.type(searchInput, 'test search')

        // Click save search
        const saveButton = screen.getByRole('button', { name: /save search/i })
        await user.click(saveButton)

        expect(mockPrompt).toHaveBeenCalledWith('Enter a name for this search:')
        expect(mockOnSaveSearch).toHaveBeenCalledWith('New Search Name', expect.objectContaining({ query: 'test search' }))

        vi.unstubAllGlobals()
    })

    it('validates form inputs', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showDateRange={true} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Try to enter invalid date
        const fromDateInput = screen.getByPlaceholderText(/from date/i)
        await user.type(fromDateInput, 'invalid-date')

        // Submit the form
        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        // Should not call onSearch with invalid data
        expect(mockOnSearch).not.toHaveBeenCalledWith(
            expect.objectContaining({
                dateFrom: 'invalid-date',
            })
        )
    })

    it('handles category selection', async () => {
        const user = userEvent.setup()
        render(<AdvancedSearch {...defaultProps} showCategory={true} />)

        // Expand advanced search
        const advancedButton = screen.getByRole('button', { name: /advanced/i })
        await user.click(advancedButton)

        // Select category
        const categorySelect = screen.getByRole('combobox', { name: /category/i })
        await user.click(categorySelect)

        const appointmentsOption = screen.getByRole('option', { name: /appointments/i })
        await user.click(appointmentsOption)

        // Submit the form
        const applyButton = screen.getByRole('button', { name: /apply filters/i })
        await user.click(applyButton)

        await waitFor(() => {
            expect(mockOnSearch).toHaveBeenCalledWith({
                category: 'appointments',
            })
        })
    })
})