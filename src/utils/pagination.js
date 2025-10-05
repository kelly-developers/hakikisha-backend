class Pagination {
  constructor(totalItems, currentPage = 1, pageSize = 10, maxPages = 10) {
    this.totalItems = totalItems;
    this.currentPage = currentPage;
    this.pageSize = pageSize;
    this.maxPages = maxPages;
    
    this.totalPages = Math.ceil(totalItems / pageSize);
    
    // Ensure current page is within valid range
    this.currentPage = Math.max(1, Math.min(currentPage, this.totalPages));
  }

  getPaginationData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize - 1, this.totalItems - 1);

    return {
      totalItems: this.totalItems,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalPages: this.totalPages,
      startIndex,
      endIndex,
      hasPreviousPage: this.currentPage > 1,
      hasNextPage: this.currentPage < this.totalPages,
      previousPage: this.currentPage > 1 ? this.currentPage - 1 : null,
      nextPage: this.currentPage < this.totalPages ? this.currentPage + 1 : null
    };
  }

  getPages() {
    const pages = [];
    let startPage, endPage;

    if (this.totalPages <= this.maxPages) {
      // Less than max pages: show all pages
      startPage = 1;
      endPage = this.totalPages;
    } else {
      // More than max pages: calculate start and end pages
      const maxPagesBeforeCurrent = Math.floor(this.maxPages / 2);
      const maxPagesAfterCurrent = Math.ceil(this.maxPages / 2) - 1;

      if (this.currentPage <= maxPagesBeforeCurrent) {
        // Current page near the start
        startPage = 1;
        endPage = this.maxPages;
      } else if (this.currentPage + maxPagesAfterCurrent >= this.totalPages) {
        // Current page near the end
        startPage = this.totalPages - this.maxPages + 1;
        endPage = this.totalPages;
      } else {
        // Current page somewhere in the middle
        startPage = this.currentPage - maxPagesBeforeCurrent;
        endPage = this.currentPage + maxPagesAfterCurrent;
      }
    }

    // Create page array
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getPaginationMetadata() {
    const data = this.getPaginationData();
    const pages = this.getPages();

    return {
      ...data,
      pages,
      showingFrom: data.startIndex + 1,
      showingTo: data.endIndex + 1,
      showingTotal: data.totalItems,
      firstPage: 1,
      lastPage: this.totalPages,
      hasFirstPage: pages[0] > 1,
      hasLastPage: pages[pages.length - 1] < this.totalPages,
      firstPageInRange: pages[0],
      lastPageInRange: pages[pages.length - 1]
    };
  }

  // Static method for common pagination patterns
  static paginate(array, page = 1, limit = 10) {
    const pagination = new Pagination(array.length, page, limit);
    const data = pagination.getPaginationData();
    
    const paginatedData = array.slice(data.startIndex, data.endIndex + 1);
    
    return {
      data: paginatedData,
      pagination: pagination.getPaginationMetadata()
    };
  }

  // SQL pagination helpers
  static getSQLPagination(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }

  static getMongoPagination(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return {
      limit: parseInt(limit),
      skip: parseInt(skip)
    };
  }

  // URL pagination helpers
  static generatePaginationLinks(baseUrl, paginationData, queryParams = {}) {
    const links = {};
    const { currentPage, totalPages, hasPreviousPage, hasNextPage } = paginationData;

    // Base URL with query parameters
    const url = new URL(baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });

    // Self link
    url.searchParams.set('page', currentPage.toString());
    links.self = url.toString();

    // First page link
    url.searchParams.set('page', '1');
    links.first = url.toString();

    // Last page link
    url.searchParams.set('page', totalPages.toString());
    links.last = url.toString();

    // Previous page link
    if (hasPreviousPage) {
      url.searchParams.set('page', (currentPage - 1).toString());
      links.prev = url.toString();
    }

    // Next page link
    if (hasNextPage) {
      url.searchParams.set('page', (currentPage + 1).toString());
      links.next = url.toString();
    }

    return links;
  }

  // Response format for APIs
  static createPaginatedResponse(data, paginationData, additionalMeta = {}) {
    return {
      success: true,
      data,
      pagination: paginationData,
      meta: {
        timestamp: new Date().toISOString(),
        ...additionalMeta
      }
    };
  }

  // Validate pagination parameters
  static validatePaginationParams(page, limit, maxLimit = 100) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    return {
      page: Math.max(1, pageNum),
      limit: Math.max(1, Math.min(limitNum, maxLimit))
    };
  }

  // Calculate page info for frontend
  static getPageInfo(totalCount, currentPage, pageSize) {
    const pagination = new Pagination(totalCount, currentPage, pageSize);
    const data = pagination.getPaginationData();

    return {
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalItems: data.totalItems,
      itemsPerPage: data.pageSize,
      hasPrevious: data.hasPreviousPage,
      hasNext: data.hasNextPage,
      startItem: data.startIndex + 1,
      endItem: data.endIndex + 1
    };
  }

  // Generate pagination controls for UI
  static generatePaginationControls(currentPage, totalPages, visiblePages = 5) {
    const pagination = new Pagination(totalPages * 10, currentPage, 10, visiblePages);
    const pages = pagination.getPages();
    const data = pagination.getPaginationData();

    return {
      pages: pages.map(page => ({
        number: page,
        isCurrent: page === currentPage,
        isEllipsis: false
      })),
      hasPrevious: data.hasPreviousPage,
      hasNext: data.hasNextPage,
      previousPage: data.previousPage,
      nextPage: data.nextPage,
      firstPage: 1,
      lastPage: totalPages,
      showFirst: pages[0] > 1,
      showLast: pages[pages.length - 1] < totalPages
    };
  }

  // Batch processing helper
  static async processInBatches(items, batchSize, processFn) {
    const results = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const start = batch * batchSize;
      const end = start + batchSize;
      const batchItems = items.slice(start, end);

      const batchResults = await processFn(batchItems, batch, totalBatches);
      results.push(...batchResults);

      // Optional: Add delay between batches to avoid rate limiting
      if (batch < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // Infinite scroll helper
  static getInfiniteScrollData(items, page, pageSize) {
    const pagination = new Pagination(items.length, page, pageSize);
    const data = pagination.getPaginationData();
    const paginatedItems = items.slice(data.startIndex, data.endIndex + 1);

    return {
      items: paginatedItems,
      hasMore: data.hasNextPage,
      nextPage: data.nextPage,
      totalItems: data.totalItems
    };
  }
}

module.exports = Pagination;