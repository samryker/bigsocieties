const API_BASE =
  localStorage.getItem("rentals_api_base") || window.RENTALS_API_BASE || "http://127.0.0.1:8000";
const tokenKey = "rentals_access_token";
const interestedKey = "bigsocieties_interested";
const unlockedKey = "bigsocieties_unlocked_contacts";

const sampleListings = [
  {
    id: "sample-1",
    owner_id: "owner-1",
    title: "Sunlit 2 BHK near Koramangala 5th Block",
    description:
      "A quiet apartment with cross ventilation, covered parking, power backup, and a short walk to cafes, offices, and daily essentials.",
    property_type: "flat",
    status: "published",
    rent: 42000,
    deposit: 160000,
    currency: "INR",
    locality: "Koramangala",
    city: "Bengaluru",
    address: { line1: "18, 7th Cross", landmark: "Near Forum Mall", postal_code: "560095" },
    location: { lat: 12.9352, lng: 77.6245 },
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 1180,
    furnishing: "semi_furnished",
    amenities: ["parking", "power backup", "security", "balcony"],
    images: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1100&q=78"],
    available_from: "2026-05-15",
    created_at: "2026-04-12T08:30:00Z",
    updated_at: "2026-05-01T11:00:00Z",
  },
  {
    id: "sample-2",
    owner_id: "owner-2",
    title: "Fully furnished 3 BHK with private terrace",
    description:
      "A larger family home with modular kitchen, terrace seating, lift access, and quick connectivity to Indiranagar Metro.",
    property_type: "flat",
    status: "published",
    rent: 76000,
    deposit: 300000,
    currency: "INR",
    locality: "Indiranagar",
    city: "Bengaluru",
    address: { line1: "12th Main Road", landmark: "Metro side", postal_code: "560038" },
    location: { lat: 12.9784, lng: 77.6408 },
    bedrooms: 3,
    bathrooms: 3,
    area_sqft: 1840,
    furnishing: "fully_furnished",
    amenities: ["parking", "security", "gym", "terrace"],
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1100&q=78"],
    available_from: "2026-05-20",
    created_at: "2026-04-18T08:30:00Z",
    updated_at: "2026-05-02T10:15:00Z",
  },
  {
    id: "sample-3",
    owner_id: "owner-3",
    title: "Residential plot close to Sarjapur Road",
    description:
      "A gated residential plot with clear approach road, water line access, and survey documents ready for buyer verification.",
    property_type: "plot",
    status: "published",
    rent: 28000,
    deposit: 90000,
    currency: "INR",
    locality: "Sarjapur",
    city: "Bengaluru",
    address: { line1: "Lakeview Layout", landmark: "Behind market road", postal_code: "562125" },
    location: { lat: 12.861, lng: 77.786 },
    bedrooms: null,
    bathrooms: null,
    area_sqft: 2400,
    furnishing: null,
    amenities: ["security", "water line", "compound"],
    images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=78"],
    available_from: "2026-06-01",
    created_at: "2026-04-20T08:30:00Z",
    updated_at: "2026-04-29T15:45:00Z",
  },
  {
    id: "sample-4",
    owner_id: "owner-4",
    title: "Compact 1 BHK beside Manyata Tech Park",
    description:
      "A practical one-bedroom unit with wardrobe, reserved two-wheeler parking, 24-hour security, and fast access to office gates.",
    property_type: "flat",
    status: "published",
    rent: 24500,
    deposit: 85000,
    currency: "INR",
    locality: "Nagavara",
    city: "Bengaluru",
    address: { line1: "Thanisandra Main Road", landmark: "Manyata back gate", postal_code: "560045" },
    location: { lat: 13.0427, lng: 77.6246 },
    bedrooms: 1,
    bathrooms: 1,
    area_sqft: 650,
    furnishing: "semi_furnished",
    amenities: ["security", "parking"],
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1100&q=78"],
    available_from: "2026-05-10",
    created_at: "2026-04-22T08:30:00Z",
    updated_at: "2026-05-03T09:30:00Z",
  },
];

const state = {
  listings: [],
  selectedId: null,
  token: localStorage.getItem(tokenKey),
  user: null,
  interested: readStoredIds(interestedKey),
  unlocked: readStoredIds(unlockedKey),
  authMode: "login",
  page: "home",
};

const grid = document.querySelector("#listing-grid");
const detailPanel = document.querySelector("#detail-panel");
const statusLine = document.querySelector("#status-line");
const countLabel = document.querySelector("#listing-count");
const medianRentLabel = document.querySelector("#median-rent");

function on(selector, eventName, handler) {
  const element = document.querySelector(selector);
  if (element) element.addEventListener(eventName, handler);
}

on("#search-form", "submit", (event) => {
  event.preventDefault();
  loadListings();
});

on("#clear-filters", "click", () => {
  document.querySelector("#search-form").reset();
  document.querySelector("#city").value = "Bengaluru";
  document.querySelector("#bedrooms").value = "";
  document.querySelector("#min-rent").value = "";
  document.querySelector("#max-rent").value = "";
  document.querySelectorAll(".amenity").forEach((item) => {
    item.checked = false;
  });
  loadListings();
});

document.querySelectorAll("#bedrooms, #min-rent, #max-rent, #sort, .amenity").forEach((control) => {
  control.addEventListener("change", () => renderListings());
});

on("#nearby-button", "click", () => {
  document.querySelector("#locality").value = "";
  document.querySelector("#city").value = "Bengaluru";
  state.listings = sampleListings.filter((listing) => listing.locality !== "Sarjapur");
  state.selectedId = state.listings[0]?.id || null;
  renderListings("Showing nearby sample inventory. Connect browser geolocation to call /properties/nearby.");
});

on("#open-login", "click", () => {
  document.querySelector("#auth-dialog").showModal();
});

on("#login-button", "click", login);
on("#owner-form", "submit", estimatePricing);
on("#tenant-nearby-search", "click", findNearbyListings);
on("#clear-interested", "click", clearInterested);
on("#tenant-profile-form", "submit", applyTenantProfile);
on("#create-listing-form", "submit", createOwnerListing);
on("#load-owner-listings", "click", loadOwnerListings);
document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});
document.querySelectorAll("[data-tenant-tab]").forEach((button) => {
  button.addEventListener("click", () => activateTenantTab(button.dataset.tenantTab));
});

if (grid) loadListings();
restoreSession();
renderInterestedListings();
renderTenantAccount();
renderOwnerListings([]);

function showPage(page) {
  if (page === "tenant") {
    window.location.href = "./tenant-dashboard.html";
    return;
  }
  if (page === "owner") {
    window.location.href = "./owner-dashboard.html";
    return;
  }
  window.location.href = "./index.html";
}

async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await gqlRequest(
      `query Me {
        me {
          email
          role
        }
      }`,
    );
    state.user = data.me;
    updateSignedInUi();
    routeAfterAuth();
  } catch (error) {
    localStorage.removeItem(tokenKey);
    state.token = null;
    state.user = null;
  }
  renderTenantAccount();
}

async function gqlRequest(query, variables = {}, token = state.token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `GraphQL request failed with ${response.status}`);
  }
  return payload.data;
}

function normalizeListing(listing) {
  return {
    id: listing.id,
    owner_id: listing.ownerId,
    title: listing.title,
    description: listing.description,
    property_type: listing.propertyType,
    status: listing.status,
    rent: listing.rent,
    deposit: listing.deposit,
    currency: listing.currency,
    locality: listing.locality,
    city: listing.city,
    address: {
      line1: listing.addressLine1,
      landmark: listing.landmark,
      postal_code: listing.postalCode,
    },
    location: { lat: listing.latitude, lng: listing.longitude },
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    area_sqft: listing.areaSqft,
    furnishing: listing.furnishing,
    amenities: listing.amenities || [],
    attributes: listing.attributes || {},
    images: (listing.images || []).map((image) => image.url),
    available_from: listing.availableFrom,
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
  };
}

async function loadListings() {
  if (!grid) return;
  const filter = {};
  const locality = document.querySelector("#locality").value.trim();
  const city = document.querySelector("#city").value.trim();
  const propertyType = document.querySelector("#property-type").value;
  const budget = document.querySelector("#budget").value;

  if (locality) filter.locality = locality;
  if (city) filter.city = city;
  if (propertyType) filter.propertyType = propertyType;
  if (budget) {
    const [min, max] = budget.split("-");
    if (min) filter.minRent = Number(min);
    if (max) filter.maxRent = Number(max);
  }

  if (statusLine) statusLine.textContent = "Searching published listings...";
  try {
    const data = await gqlRequest(
      `query Listings($filter: ListingFilterInput) {
        listings(filter: $filter) {
          total
          items {
            id
            ownerId
            title
            description
            propertyType
            status
            rent
            deposit
            currency
            locality
            city
            addressLine1
            landmark
            postalCode
            latitude
            longitude
            bedrooms
            bathrooms
            areaSqft
            furnishing
            amenities
            attributes
            availableFrom
            createdAt
            updatedAt
            images {
              url
            }
          }
        }
      }`,
      { filter },
      null,
    );
    const payload = data.listings;
    state.listings = payload.items.map(normalizeListing);
    state.selectedId = state.listings[0]?.id || null;
    renderListings(`Showing ${payload.total} result${payload.total === 1 ? "" : "s"} from the backend.`);
  } catch (error) {
    state.listings = sampleListings;
    state.selectedId = state.listings[0]?.id || null;
    renderListings("Backend unavailable. Showing polished sample listings for design and workflow review.");
  }
}

function renderListings(message) {
  if (!grid) return;
  const visible = filteredListings();
  const selectedStillVisible = visible.some((listing) => listing.id === state.selectedId);
  if (!selectedStillVisible) state.selectedId = visible[0]?.id || null;

  grid.innerHTML = "";
  visible.forEach((listing) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `listing-card${listing.id === state.selectedId ? " selected" : ""}`;
    card.innerHTML = `
      <img src="${listing.images?.[0] || fallbackImage(listing)}" alt="${listing.title}" loading="lazy" />
      <span class="listing-body">
        <span class="listing-title">
          <h3>${listing.title}</h3>
          <span class="rent">${formatMoney(listing.rent, listing.currency)}</span>
        </span>
        <span class="meta-row">
          <span>${listing.locality}, ${listing.city}</span>
          <span>${listing.area_sqft ? `${listing.area_sqft} sqft` : "Area on request"}</span>
        </span>
        <span class="amenity-row">${summaryPills(listing).join("")}</span>
      </span>
    `;
    card.addEventListener("click", () => {
      state.selectedId = listing.id;
      renderListings(message);
    });
    grid.append(card);
  });

  if (countLabel) countLabel.textContent = String(visible.length);
  if (medianRentLabel) medianRentLabel.textContent = formatMoney(median(visible.map((item) => item.rent)), "INR");
  if (statusLine) statusLine.textContent = message || `${visible.length} listing${visible.length === 1 ? "" : "s"} match your filters.`;
  renderDetail(visible.find((listing) => listing.id === state.selectedId));
}

function filteredListings() {
  const bedrooms = document.querySelector("#bedrooms").value;
  const minRent = Number(document.querySelector("#min-rent").value || 0);
  const maxRent = Number(document.querySelector("#max-rent").value || 0);
  const amenities = [...document.querySelectorAll(".amenity:checked")].map((item) => item.value);
  const sort = document.querySelector("#sort").value;

  const visible = state.listings.filter((listing) => {
    if (bedrooms && Number(listing.bedrooms || 0) !== Number(bedrooms)) return false;
    if (minRent && listing.rent < minRent) return false;
    if (maxRent && listing.rent > maxRent) return false;
    return amenities.every((amenity) =>
      listing.amenities.map((item) => item.toLowerCase()).includes(amenity.toLowerCase()),
    );
  });

  return visible.sort((a, b) => {
    if (sort === "rent-asc") return a.rent - b.rent;
    if (sort === "rent-desc") return b.rent - a.rent;
    if (sort === "area-desc") return (b.area_sqft || 0) - (a.area_sqft || 0);
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
}

function renderDetail(listing) {
  if (!detailPanel) return;
  if (!listing) {
    detailPanel.innerHTML = `
      <div class="empty-detail">
        <span>No listings match</span>
        <p>Adjust filters or clear the search to continue browsing.</p>
      </div>
    `;
    return;
  }

  detailPanel.innerHTML = `
    <img class="detail-image" src="${listing.images?.[0] || fallbackImage(listing)}" alt="${listing.title}" />
    <div class="detail-body">
      <div>
        <p class="eyebrow">${listing.property_type}</p>
        <h2>${listing.title}</h2>
      </div>
      <div class="rent">${formatMoney(listing.rent, listing.currency)} / month</div>
      <p class="description">${listing.description}</p>
      <div class="fact-list">
        ${detailFact("Deposit", formatMoney(listing.deposit, listing.currency))}
        ${detailFact("Available", listing.available_from ? formatDate(listing.available_from) : "On request")}
        ${detailFact("Layout", listing.bedrooms ? `${listing.bedrooms} BHK` : "Plot")}
        ${detailFact("Bathrooms", listing.bathrooms || "N/A")}
        ${detailFact("Area", listing.area_sqft ? `${listing.area_sqft} sqft` : "On request")}
        ${detailFact("Furnishing", humanize(listing.furnishing || "not_applicable"))}
      </div>
      <div class="amenity-row">${listing.amenities.map((item) => `<span class="pill">${humanize(item)}</span>`).join("")}</div>
      <div class="detail-actions">
        <button class="secondary-button" type="button" id="save-interest">${isInterested(listing.id) ? "Saved" : "Save interest"}</button>
        <button class="ghost-button" type="button" id="unlock-contact">${isUnlocked(listing.id) ? "Owner: +91 98765 43210" : "Unlock owner number ₹29"}</button>
      </div>
      <form class="inquiry-form" data-property-id="${listing.id}">
        <label>
          Message owner
          <textarea placeholder="Share your move-in date and viewing preference."></textarea>
        </label>
        <button class="primary-button" type="submit">Send inquiry</button>
        <output class="form-output"></output>
      </form>
    </div>
  `;

  detailPanel.querySelector("#save-interest").addEventListener("click", () => saveInterest(listing.id));
  detailPanel.querySelector("#unlock-contact").addEventListener("click", () => unlockContact(listing.id));
  detailPanel.querySelector(".inquiry-form").addEventListener("submit", sendInquiry);
}

async function sendInquiry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const output = form.querySelector("output");
  const message = form.querySelector("textarea").value.trim();
  const propertyId = form.dataset.propertyId;

  if (!state.token) {
    output.textContent = "Sign in as a tenant before sending inquiries.";
    document.querySelector("#auth-dialog").showModal();
    return;
  }

  if (message.length < 10) {
    output.textContent = "Add at least 10 characters so the owner has context.";
    return;
  }

  try {
    await gqlRequest(
      `mutation CreateInquiry($listingId: ID!, $message: String!) {
        createInquiry(listingId: $listingId, message: $message) {
          id
        }
      }`,
      { listingId: propertyId, message },
    );
    output.textContent = "Inquiry sent.";
    form.reset();
  } catch (error) {
    output.textContent = "Could not send inquiry. Confirm the backend is running and the account has tenant role.";
  }
}

async function login() {
  const output = document.querySelector("#login-output");
  const email = document.querySelector("#login-email").value.trim();
  const password = document.querySelector("#login-password").value;

  if (!email || !password) {
    output.textContent = "Email and password are required.";
    return;
  }

  try {
    const isRegister = state.authMode === "register";
    const data = await gqlRequest(
      isRegister
        ? `mutation Register($input: RegisterInput!) {
        register(input: $input) {
          accessToken
          user {
            email
            role
          }
        }
      }`
        : `mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          user {
            email
            role
          }
        }
      }`,
      {
        input: isRegister
          ? {
              email,
              password,
              role: document.querySelector("#register-role").value,
              phone: document.querySelector("#register-phone").value.trim() || null,
            }
          : { email, password },
      },
      null,
    );
    const payload = isRegister ? data.register : data.login;
    state.token = payload.accessToken;
    state.user = payload.user;
    localStorage.setItem(tokenKey, state.token);
    output.textContent = `${isRegister ? "Registered" : "Signed in"} as ${payload.user.role}.`;
    updateSignedInUi();
    renderTenantAccount();
    document.querySelector("#auth-dialog").close();
    routeAfterAuth();
  } catch (error) {
    output.textContent = `${state.authMode === "register" ? "Register" : "Sign in"} failed. Check credentials, duplicate phone/email, and backend availability.`;
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  document.querySelector(".dialog-shell").classList.toggle("register-mode", mode === "register");
  document.querySelector("#login-button").textContent = mode === "register" ? "Create account" : "Sign in";
  document.querySelector("#login-output").textContent = "";
}

function updateSignedInUi() {
  const loginButton = document.querySelector("#open-login");
  if (loginButton) loginButton.textContent = state.user?.email || "Sign in";
}

function routeAfterAuth() {
  if (!state.user) return;
  const currentPage = document.body?.dataset.page;
  if (state.user.role === "owner" || state.user.role === "admin") {
    if (currentPage === "owner") {
      loadOwnerListings();
      return;
    }
    showPage("owner");
    return;
  }
  if (currentPage === "tenant") {
    activateTenantTab("nearby");
    return;
  }
  showPage("tenant");
}

function activateTenantTab(tabName) {
  document.querySelectorAll("[data-tenant-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tenantTab === tabName);
  });
  document.querySelectorAll(".tenant-tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tenant-tab-${tabName}`);
  });
}

function readStoredIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function storeIds(key, ids) {
  localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

function isInterested(id) {
  return state.interested.includes(id);
}

function isUnlocked(id) {
  return state.unlocked.includes(id);
}

function saveInterest(id) {
  if (!isInterested(id)) {
    state.interested.push(id);
    storeIds(interestedKey, state.interested);
  }
  renderListings();
  renderInterestedListings();
  activateTenantTab("interested");
  document.querySelector("#tenant-dashboard")?.scrollIntoView({ behavior: "smooth" });
}

function clearInterested() {
  state.interested = [];
  storeIds(interestedKey, state.interested);
  renderInterestedListings();
  renderListings();
}

function unlockContact(id) {
  if (!isUnlocked(id)) {
    state.unlocked.push(id);
    storeIds(unlockedKey, state.unlocked);
  }
  if (!isInterested(id)) {
    state.interested.push(id);
    storeIds(interestedKey, state.interested);
  }
  renderListings();
  renderInterestedListings();
}

function renderInterestedListings() {
  const list = document.querySelector("#interested-list");
  if (!list) return;
  const listings = [...state.listings, ...sampleListings].filter((listing) => isInterested(listing.id));
  const uniqueListings = listings.filter((listing, index, array) => array.findIndex((item) => item.id === listing.id) === index);

  const unlockCount = document.querySelector("#unlock-count");
  const unlockSpend = document.querySelector("#unlock-spend");
  if (unlockCount) unlockCount.textContent = String(state.unlocked.length);
  if (unlockSpend) unlockSpend.textContent = formatMoney(state.unlocked.length * 29, "INR");

  if (!uniqueListings.length) {
    list.innerHTML = `
      <div class="empty-inline">
        <strong>No interested listings yet</strong>
        <span>Save homes from listing details and compare them here before unlocking owner contact.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = uniqueListings
    .map(
      (listing) => `
        <article class="interest-item">
          <img src="${listing.images?.[0] || fallbackImage(listing)}" alt="${listing.title}" />
          <div>
            <h4>${listing.title}</h4>
            <p>${listing.locality}, ${listing.city} · ${formatMoney(listing.rent, listing.currency)}</p>
            <div class="interest-actions">
              <button class="secondary-button" type="button" data-focus-listing="${listing.id}">View</button>
              <button class="ghost-button" type="button" data-unlock-listing="${listing.id}">
                ${isUnlocked(listing.id) ? "+91 98765 43210" : "Unlock ₹29"}
              </button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  list.querySelectorAll("[data-focus-listing]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.focusListing;
      renderListings();
      document.querySelector("#listings").scrollIntoView({ behavior: "smooth" });
    });
  });
  list.querySelectorAll("[data-unlock-listing]").forEach((button) => {
    button.addEventListener("click", () => unlockContact(button.dataset.unlockListing));
  });
}

async function findNearbyListings() {
  const status = document.querySelector("#tenant-nearby-status");
  const grid = document.querySelector("#tenant-nearby-grid");
  status.textContent = "Checking nearby low-rent listings...";

  const renderNearby = (items, message) => {
    status.textContent = message;
    grid.innerHTML = items
      .slice(0, 4)
      .map(
        (listing) => `
          <button class="mini-listing-card" type="button" data-nearby-listing="${listing.id}">
            <img src="${listing.images?.[0] || fallbackImage(listing)}" alt="${listing.title}" />
            <span>
              <strong>${listing.title}</strong>
              <small>${listing.locality} · ${formatMoney(listing.rent, listing.currency)}</small>
            </span>
          </button>
        `,
      )
      .join("");
    grid.querySelectorAll("[data-nearby-listing]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.nearbyListing;
        renderListings();
        document.querySelector("#listings").scrollIntoView({ behavior: "smooth" });
      });
    });
  };

  const cheapListings = [...state.listings].sort((a, b) => a.rent - b.rent);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => renderNearby(cheapListings.length ? cheapListings : sampleListings, "Showing the cheapest listings near your search area."),
      () => renderNearby(sampleListings.sort((a, b) => a.rent - b.rent), "Location was not shared. Showing cheapest sample inventory."),
      { timeout: 6000 },
    );
  } else {
    renderNearby(sampleListings.sort((a, b) => a.rent - b.rent), "Geolocation is unavailable. Showing cheapest sample inventory.");
  }
}

function applyTenantProfile(event) {
  event.preventDefault();
  document.querySelector("#city").value = document.querySelector("#tenant-city").value.trim() || "Bengaluru";
  document.querySelector("#locality").value = document.querySelector("#tenant-locality").value.trim();
  document.querySelector("#max-rent").value = document.querySelector("#tenant-max-rent").value;
  loadListings();
  document.querySelector("#listings").scrollIntoView({ behavior: "smooth" });
}

function renderTenantAccount() {
  const title = document.querySelector("#tenant-account-title");
  const facts = document.querySelector("#tenant-account-facts");
  if (!title || !facts) return;
  title.textContent = state.user ? state.user.email : "Guest tenant";
  facts.innerHTML = `
    ${detailFact("Role", state.user?.role ? humanize(state.user.role) : "Guest")}
    ${detailFact("Saved homes", state.interested.length)}
    ${detailFact("Unlocked contacts", state.unlocked.length)}
    ${detailFact("Backend", API_BASE)}
  `;
}

async function createOwnerListing(event) {
  event.preventDefault();
  const output = document.querySelector("#owner-create-output");

  if (!state.token) {
    output.textContent = "Sign in as an owner before creating listings.";
    document.querySelector("#auth-dialog").showModal();
    return;
  }

  const images = document
    .querySelector("#owner-images")
    .value.split("\n")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({ url, sortOrder: index }));
  const furnishing = document.querySelector("#owner-furnishing").value;
  const availableFrom = document.querySelector("#owner-available-from").value;
  const input = {
    title: document.querySelector("#owner-title").value.trim(),
    description: document.querySelector("#owner-description").value.trim(),
    propertyType: document.querySelector("#owner-property-type").value,
    rent: Number(document.querySelector("#owner-rent").value),
    deposit: Number(document.querySelector("#owner-deposit").value),
    currency: "INR",
    locality: document.querySelector("#owner-locality").value.trim(),
    city: document.querySelector("#owner-city").value.trim(),
    addressLine1: document.querySelector("#owner-address").value.trim(),
    latitude: Number(document.querySelector("#owner-latitude").value),
    longitude: Number(document.querySelector("#owner-longitude").value),
    bedrooms: numberOrNull("#owner-bedrooms"),
    bathrooms: numberOrNull("#owner-bathrooms"),
    areaSqft: numberOrNull("#owner-area"),
    furnishing: furnishing || null,
    amenities: document
      .querySelector("#owner-amenities")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    attributes: {
      facing: document.querySelector("#owner-facing").value.trim(),
      parkingType: document.querySelector("#owner-parking-type").value.trim(),
      societyRules: document.querySelector("#owner-rules").value.trim(),
    },
    images,
    availableFrom: availableFrom || null,
  };

  output.textContent = "Creating listing draft...";
  try {
    const data = await gqlRequest(
      `mutation CreateListing($input: ListingInput!) {
        createListing(input: $input) {
          id
          title
          status
          rent
          city
          locality
          updatedAt
          images { url }
        }
      }`,
      { input },
    );
    output.textContent = `Draft created: ${data.createListing.title}`;
    await loadOwnerListings();
  } catch (error) {
    output.textContent = "Could not create listing. Confirm the signed-in account has owner role.";
  }
}

async function loadOwnerListings() {
  const panel = document.querySelector("#owner-listings");
  if (!panel) return;
  if (!state.token) {
    panel.innerHTML = `<div class="empty-inline"><strong>Owner sign-in required</strong><span>Sign in to see drafts, published listings, and inquiries.</span></div>`;
    return;
  }

  panel.innerHTML = `<div class="status-line">Loading owner listings...</div>`;
  try {
    const data = await gqlRequest(
      `query OwnerListings {
        ownerListings {
          id
          title
          status
          rent
          city
          locality
          updatedAt
          images { url }
        }
      }`,
    );
    renderOwnerListings(data.ownerListings.map(normalizeOwnerListing));
  } catch (error) {
    panel.innerHTML = `<div class="empty-inline"><strong>Could not load owner listings</strong><span>Use an owner account to manage inventory.</span></div>`;
  }
}

function normalizeOwnerListing(listing) {
  return {
    id: listing.id,
    title: listing.title,
    status: listing.status,
    rent: listing.rent,
    city: listing.city,
    locality: listing.locality,
    updated_at: listing.updatedAt,
    images: (listing.images || []).map((image) => image.url),
    currency: "INR",
  };
}

function renderOwnerListings(listings) {
  const panel = document.querySelector("#owner-listings");
  if (!panel) return;
  if (!listings.length) {
    panel.innerHTML = `<div class="empty-inline"><strong>No owner listings loaded</strong><span>Create a draft or refresh after signing in.</span></div>`;
    return;
  }
  panel.innerHTML = listings
    .map(
      (listing) => `
        <article class="owner-listing-row">
          <img src="${listing.images?.[0] || fallbackImage(listing)}" alt="${listing.title}" />
          <div>
            <h4>${listing.title}</h4>
            <p>${listing.locality}, ${listing.city} · ${formatMoney(listing.rent, listing.currency)}</p>
            <span class="status-badge">${humanize(listing.status)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function numberOrNull(selector) {
  const value = document.querySelector(selector).value;
  return value === "" ? null : Number(value);
}

async function estimatePricing(event) {
  event.preventDefault();
  const output = document.querySelector("#pricing-output");
  const bedrooms = document.querySelector("#pricing-bedrooms").value;

  output.textContent = "Checking local published listings...";
  try {
    const data = await gqlRequest(
      `query PricingSuggestion($locality: String!, $propertyType: GQLPropertyType!, $bedrooms: Int) {
        pricingSuggestion(locality: $locality, propertyType: $propertyType, bedrooms: $bedrooms) {
          suggestedMin
          suggestedMax
          sampleSize
        }
      }`,
      {
        locality: document.querySelector("#pricing-locality").value.trim(),
        propertyType: document.querySelector("#pricing-type").value,
        bedrooms: bedrooms ? Number(bedrooms) : null,
      },
      null,
    );
    const payload = data.pricingSuggestion;
    if (!payload.sampleSize) {
      output.textContent = "No comparable published listings found yet.";
      return;
    }
    output.textContent = `${formatMoney(payload.suggestedMin, "INR")} to ${formatMoney(payload.suggestedMax, "INR")} based on ${payload.sampleSize} samples.`;
  } catch (error) {
    output.textContent = "Backend unavailable. Sample comparable range: ₹38,000 to ₹46,000.";
  }
}

function summaryPills(listing) {
  const values = [
    listing.bedrooms ? `${listing.bedrooms} BHK` : "Plot",
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    humanize(listing.furnishing || listing.property_type),
  ].filter(Boolean);
  return values.map((value) => `<span class="pill">${value}</span>`);
}

function detailFact(label, value) {
  return `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatMoney(value, currency = "INR") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function humanize(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function fallbackImage(listing) {
  return listing.property_type === "plot"
    ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=78"
    : "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1100&q=78";
}
