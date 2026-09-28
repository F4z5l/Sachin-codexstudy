tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        themeBg: '#0a0a0a',
                        cardBg: '#121212',
                        themeYellow: '#FACC15',
                        themeAmber: '#F59E0B',
                        themeGreen: '#10B981',
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        syne: ['Syne', 'sans-serif'],
                    }
                }
            }
        }

/* INLINE */

lucide.createIcons();

        window.showToast = function (msg, type = 'success') {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-medium text-sm border toast-enter`;

            if (type === 'success') {
                toast.classList.add('bg-green-950/90', 'border-green-800', 'text-green-400');
                icon.setAttribute('data-lucide', 'check-circle-2');
            } else {
                toast.classList.add('bg-red-950/90', 'border-red-800', 'text-red-400');
                icon.setAttribute('data-lucide', 'alert-circle');
            }

            document.getElementById('toast-msg').innerText = msg;
            lucide.createIcons();

            setTimeout(() => {
                toast.classList.remove('toast-enter');
                toast.classList.add('hidden');
            }, 3000);
        };

        window.handleStudyClick = function (event, batchId) {
            event.preventDefault();
            window.location.href = `content.html?id=${batchId}`;
        };

        let batchesData = { new: [] };
        let currentTab = 'new';
        let wishlist = JSON.parse(localStorage.getItem('NextHope_wishlist') || '[]').map(String);

        const ITEMS_PER_PAGE = 12;
        let currentlyDisplayedCount = 0;
        let currentFilteredData = [];

        const batchGrid = document.getElementById('batchGrid');
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const emptyState = document.getElementById('emptyState');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const loadMoreContainer = document.getElementById('loadMoreContainer');

        document.addEventListener('DOMContentLoaded', () => {
            updateWishlistCount();
            fetchBatches();
        });

        async function fetchBatches() {
            try {
                const response = await fetch('batches.json');
                if (!response.ok) throw new Error("Failed to load JSON");
                const rawData = await response.json();

                batchesData.new = [...(rawData.new || []), ...(rawData.old || [])];

                loadingIndicator.classList.add('hidden');
                batchGrid.classList.remove('hidden');
                applyFiltersAndRender(true);
            } catch (error) {
                console.error("Error fetching batches:", error);
                loadingIndicator.innerHTML = `
                    <div class="text-center py-10">
                        <i data-lucide="alert-circle" class="w-8 h-8 text-stone-600 mx-auto mb-2"></i>
                        <p class="text-stone-400 font-medium text-sm">Failed to load batches</p>
                    </div>`;
                lucide.createIcons();
            }
        }

        searchInput.addEventListener('input', () => {
            if (searchInput.value.length > 0) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
            applyFiltersAndRender(true);
        });

        function clearSearch() {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            applyFiltersAndRender(true);
            searchInput.focus();
        }

        window.switchTab = function (tabName) {
            currentTab = tabName;
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('bg-white/10', 'text-white', 'border-white/10');
                btn.classList.add('bg-transparent', 'text-stone-400', 'border-transparent');
            });

            const activeTab = document.getElementById(`tab-${tabName}`);
            activeTab.classList.remove('bg-transparent', 'text-stone-400', 'border-transparent');
            activeTab.classList.add('bg-white/10', 'text-white', 'border-white/10');
            applyFiltersAndRender(true);
        };

        function applyFiltersAndRender(resetPagination = false) {
            const query = searchInput.value.toLowerCase().trim();

            if (currentTab === 'wishlist') {
                const allBatches = batchesData.new;
                const uniqueBatches = Array.from(new Map(allBatches.map(item => [String(item.id), item])).values());
                currentFilteredData = uniqueBatches.filter(batch => wishlist.includes(String(batch.id)));
            } else {
                currentFilteredData = batchesData[currentTab] || [];
            }

            if (query) {
                currentFilteredData = currentFilteredData.filter(batch => {
                    return batch.title.toLowerCase().includes(query) || String(batch.id).includes(query);
                });
            }

            if (resetPagination) {
                currentlyDisplayedCount = 0;
                batchGrid.innerHTML = '';
            }

            renderBatchSlice();
        }

        function renderBatchSlice() {
            if (currentFilteredData.length === 0) {
                batchGrid.classList.add('hidden');
                emptyState.classList.remove('hidden');
                emptyState.classList.add('flex');
                loadMoreContainer.classList.add('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            batchGrid.classList.remove('hidden');

            const nextCount = Math.min(currentlyDisplayedCount + ITEMS_PER_PAGE, currentFilteredData.length);
            const itemsToRender = currentFilteredData.slice(currentlyDisplayedCount, nextCount);

            const html = itemsToRender.map((batch, index) => createCardHTML(batch, index)).join('');

            if (currentlyDisplayedCount === 0) {
                batchGrid.innerHTML = html;
            } else {
                batchGrid.insertAdjacentHTML('beforeend', html);
            }

            currentlyDisplayedCount = nextCount;
            lucide.createIcons();

            if (currentlyDisplayedCount < currentFilteredData.length) {
                loadMoreContainer.classList.remove('hidden');
            } else {
                loadMoreContainer.classList.add('hidden');
            }
        }

        window.loadMore = function () {
            const btn = document.getElementById('loadMoreBtn');
            if (btn.disabled) return;

            const originalHtml = btn.innerHTML;
            btn.disabled = true;

            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-stone-400"></i> Loading`;
            lucide.createIcons();

            setTimeout(() => {
                renderBatchSlice();
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                lucide.createIcons();
            }, 300);
        };

        function createCardHTML(batch, index) {
            const id = String(batch.id);
            const isEnrolled = wishlist.includes(id);
            const delay = (index % ITEMS_PER_PAGE * 30) + 'ms';

            const enrollBtnState = isEnrolled
                ? `<button onclick="toggleEnroll(event, '${id}')" class="bg-themeGreen/10 text-themeGreen border border-themeGreen/20 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 hover:bg-themeGreen/20 transition-colors"><i data-lucide="check" class="w-3.5 h-3.5"></i> ENROLLED</button>`
                : `<button onclick="toggleEnroll(event, '${id}')" class="bg-themeGreen hover:bg-emerald-400 text-black px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"><i data-lucide="plus" class="w-3.5 h-3.5"></i> ENROLL</button>`;

            return `
                <div class="premium-card rounded-xl overflow-hidden fade-in-pop group flex flex-col relative" style="animation-delay: ${delay}">
                    <div class="relative w-full aspect-[16/9] overflow-hidden bg-black border-b border-white/5">
                        <img src="${batch.thumbnail}" alt="${batch.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100">
                        <div class="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-90"></div>
                        <div class="absolute top-3 right-3 bg-themeGreen/20 backdrop-blur-md border border-themeGreen/30 px-2 py-1 rounded flex items-center justify-center z-10 shadow-sm">
                            <span class="text-themeGreen text-[9px] font-black tracking-widest uppercase">FREE</span>
                        </div>
                    </div>
                    <div class="p-5 flex flex-col flex-1 relative z-20">
                        <h3 class="text-gray-200 font-semibold text-sm leading-relaxed mb-4 line-clamp-2 group-hover:text-white transition-colors">${batch.title}</h3>
                        <div class="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <div id="enroll-container-${id}">
                                ${enrollBtnState}
                            </div>
                            <button onclick="handleStudyClick(event, '${id}')" class="bg-themeYellow hover:bg-yellow-400 text-black px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md">
                                Let's Study <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        window.toggleEnroll = function (event, batchId) {
            event.stopPropagation();
            batchId = String(batchId);

            const index = wishlist.indexOf(batchId);
            const container = document.getElementById(`enroll-container-${batchId}`);

            if (index === -1) {
                wishlist.push(batchId);
                showToast("Enrolled in batch!", "success");
                if (container) {
                    container.innerHTML = `<button onclick="toggleEnroll(event, '${batchId}')" class="bg-themeGreen/10 text-themeGreen border border-themeGreen/20 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 hover:bg-themeGreen/20 transition-colors"><i data-lucide="check" class="w-3.5 h-3.5"></i> ENROLLED</button>`;
                }
            } else {
                wishlist.splice(index, 1);
                if (container) {
                    container.innerHTML = `<button onclick="toggleEnroll(event, '${batchId}')" class="bg-themeGreen hover:bg-emerald-400 text-black px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"><i data-lucide="plus" class="w-3.5 h-3.5"></i> ENROLL</button>`;
                }
                if (currentTab === 'wishlist') {
                    applyFiltersAndRender(true);
                }
            }

            localStorage.setItem('NextHope_wishlist', JSON.stringify(wishlist));
            updateWishlistCount();
            lucide.createIcons();
        };

        function updateWishlistCount() {
            const countEl = document.getElementById('wishlist-count');
            const mobileIndicator = document.getElementById('mobile-wishlist-indicator');

            if (wishlist.length > 0) {
                countEl.innerText = wishlist.length;
                countEl.classList.remove('hidden');
                mobileIndicator.classList.remove('hidden');
            } else {
                countEl.classList.add('hidden');
                mobileIndicator.classList.add('hidden');
            }
        }