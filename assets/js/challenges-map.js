import Alpine from "alpinejs";
import dayjs from "dayjs";
import { Modal, Tab, Tooltip } from "bootstrap";

import CTFd from "./index";
import highlight from "./theme/highlight";

// Load map libraries - scripts are loaded in template, just verify they're ready
function loadMapLibraries() {
  return new Promise((resolve, reject) => {
    // Helper to get jQuery (CTFd might use $ or jQuery)
    const getJQuery = () => window.$ || window.jQuery;
    
    // Check if already loaded
    const $ = getJQuery();
    if (window.Raphael && $ && $.mapael && $.mapael.maps && $.mapael.maps.france) {
      resolve();
      return;
    }

    // Scripts should be loaded in template, just wait for them
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait (increased for slower connections)
    
    const checkInterval = setInterval(() => {
      attempts++;
      const $ = getJQuery();
      
      if (window.Raphael && $ && $.mapael && $.mapael.maps && $.mapael.maps.france) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('Map libraries not loaded after waiting');
        console.log('Raphael:', !!window.Raphael);
        console.log('jQuery ($):', !!window.$);
        console.log('jQuery (jQuery):', !!window.jQuery);
        const $ = getJQuery();
        console.log('Mapael:', !!($ && $.mapael));
        console.log('Available maps:', $ && $.mapael && $.mapael.maps ? Object.keys($.mapael.maps) : 'none');
        reject(new Error('Map libraries not loaded'));
      }
    }, 100);
  });
}

function addTargetBlank(html) {
  let dom = new DOMParser();
  let view = dom.parseFromString(html, "text/html");
  let links = view.querySelectorAll('a[href*="://"]');
  links.forEach(link => {
    link.setAttribute("target", "_blank");
  });
  return view.documentElement.outerHTML;
}

window.Alpine = Alpine;

Alpine.store("challenge", {
  data: {
    view: "",
  },
});

Alpine.data("Hint", () => ({
  id: null,
  html: null,

  async showHint(event) {
    if (event.target.open) {
      let response = await CTFd.pages.challenge.loadHint(this.id);

      // Hint has some kind of prerequisite or access prevention
      if (response.errors) {
        event.target.open = false;
        CTFd._functions.challenge.displayUnlockError(response);
        return;
      }
      let hint = response.data;
      if (hint.content) {
        this.html = addTargetBlank(hint.html);
      } else {
        let answer = await CTFd.pages.challenge.displayUnlock(this.id);
        if (answer) {
          let unlock = await CTFd.pages.challenge.loadUnlock(this.id);

          if (unlock.success) {
            let response = await CTFd.pages.challenge.loadHint(this.id);
            let hint = response.data;
            this.html = addTargetBlank(hint.html);
          } else {
            event.target.open = false;
            CTFd._functions.challenge.displayUnlockError(unlock);
          }
        } else {
          event.target.open = false;
        }
      }
    }
  },
}));

Alpine.data("Challenge", () => ({
  id: null,
  next_id: null,
  submission: "",
  tab: null,
  solves: [],
  submissions: [],
  solution: null,
  response: null,
  share_url: null,
  max_attempts: 0,
  attempts: 0,
  ratingValue: 0,
  hoveredRating: 0,
  selectedRating: 0,
  ratingReview: "",
  ratingSubmitted: false,

  async init() {
    highlight();
  },

  getStyles() {
    let styles = {
      "modal-dialog": true,
    };
    try {
      let size = CTFd.config.themeSettings.challenge_window_size;
      switch (size) {
        case "sm":
          styles["modal-sm"] = true;
          break;
        case "lg":
          styles["modal-lg"] = true;
          break;
        case "xl":
          styles["modal-xl"] = true;
          break;
        default:
          break;
      }
    } catch (error) {
      // Ignore errors with challenge window size
      console.log("Error processing challenge_window_size");
      console.log(error);
    }
    return styles;
  },

  async showChallenge() {
    new Tab(this.$el).show();
  },

  async showSolves() {
    this.solves = await CTFd.pages.challenge.loadSolves(this.id);
    this.solves.forEach(solve => {
      solve.date = dayjs(solve.date).format("MMMM Do, h:mm:ss A");
      return solve;
    });
    new Tab(this.$el).show();
  },

  async showSubmissions() {
    let response = await CTFd.pages.users.userSubmissions("me", this.id);
    this.submissions = response.data;
    this.submissions.forEach(s => {
      s.date = dayjs(s.date).format("MMMM Do, h:mm:ss A");
      return s;
    });
    new Tab(this.$el).show();
  },

  getSolutionId() {
    let data = Alpine.store("challenge").data;
    return data.solution_id;
  },

  async showSolution() {
    let solution_id = this.getSolutionId();
    CTFd._functions.challenge.displaySolution = solution => {
      this.solution = solution.html;
      new Tab(this.$el).show();
    };
    await CTFd.pages.challenge.displaySolution(solution_id);
  },

  getNextId() {
    let data = Alpine.store("challenge").data;
    return data.next_id;
  },

  async nextChallenge() {
    let modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");

    // TODO: Get rid of this private attribute access
    // See https://github.com/twbs/bootstrap/issues/31266
    modal._element.addEventListener(
      "hidden.bs.modal",
      event => {
        // Dispatch load-challenge event to call loadChallenge in the ChallengeBoard
        Alpine.nextTick(() => {
          this.$dispatch("load-challenge", this.getNextId());
        });
      },
      { once: true },
    );
    modal.hide();
  },

  async getShareUrl() {
    let body = {
      type: "solve",
      challenge_id: this.id,
    };
    const response = await CTFd.fetch("/api/v1/shares", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    const url = data["data"]["url"];
    this.share_url = url;
  },

  copyShareUrl() {
    navigator.clipboard.writeText(this.share_url);
    let t = Tooltip.getOrCreateInstance(this.$el);
    t.enable();
    t.show();
    setTimeout(() => {
      t.hide();
      t.disable();
    }, 2000);
  },

  async submitChallenge() {
    this.response = await CTFd.pages.challenge.submitChallenge(
      this.id,
      this.submission,
    );

    await this.renderSubmissionResponse();
  },

  async renderSubmissionResponse() {
    if (this.response.data.status === "correct") {
      this.submission = "";
    }

    // Increment attempts counter
    if (
      this.max_attempts > 0 &&
      this.response.data.status != "already_solved" &&
      this.response.data.status != "ratelimited"
    ) {
      this.attempts += 1;
    }

    // Dispatch load-challenges event to call loadChallenges in the ChallengeBoard
    this.$dispatch("load-challenges");
  },

  async submitRating() {
    const response = await CTFd.pages.challenge.submitRating(
      this.id,
      this.selectedRating,
      this.ratingReview,
    );
    if (response.value) {
      this.ratingValue = this.selectedRating;
      this.ratingSubmitted = true;
    } else {
      alert("Error submitting rating");
    }
  },
}));

// ============================================================================
// CANADA MAP CHALLENGE DISPLAY FUNCTIONALITY
// ============================================================================
// This Alpine.js component handles the interactive Canada map that displays
// challenges as Fallout-themed icons. Each challenge category is mapped to a
// province/territory, and individual challenges appear as clickable icons.
//
// CUSTOMIZATION AREAS:
// - Province mapping logic (mapChallengesToProvinces)
// - Icon appearance (getFalloutIconPath, chal_plots configuration)
// - Colors (colorHash, attrs.fill/stroke in chal_plots)
// - Icon positioning (province_centers, offset calculations)
// - Map styling (createMap -> mapConfig)
// - Checkmark appearance (addCheckmarksToSolvedChallenges)
// ============================================================================

Alpine.data("ChallengeMap", () => ({
  // ========================================================================
  // DATA PROPERTIES - Customize these to change behavior
  // ========================================================================
  loaded: false,                    // Whether map libraries have loaded
  challenges: [],                   // Array of all challenges from CTFd API
  challenge: null,                  // Currently selected challenge
  provinces: {},                    // Province code -> challenge ID mapping (legacy)
  provinces_used: [],                // List of provinces that have challenges assigned
  chal_areas: {},                   // Mapael area configuration (province styling)
  categories: [],                   // Unique challenge categories found
  category_colors: [],              // Color legend for categories
  province_challenges: {},           // Province code -> array of challenge IDs
  chal_plots: {},                   // Challenge icon/plot configurations for Mapael
  province_centers: {},             // X/Y coordinates for icon placement per province

  async init() {
    try {
      this.challenges = await CTFd.pages.challenges.getChallenges();
      
      // Load map libraries and initialize map
      await loadMapLibraries().catch(error => {
        console.error('Failed to load map libraries:', error);
        this.loaded = true; // Still set loaded to true to show the container
      });
      this.loaded = true;
      this.initializeMap();

      if (window.location.hash) {
        let chalHash = decodeURIComponent(window.location.hash.substring(1));
        let idx = chalHash.lastIndexOf("-");
        if (idx >= 0) {
          let pieces = [chalHash.slice(0, idx), chalHash.slice(idx + 1)];
          let id = pieces[1];
          await this.loadChallenge(id);
        }
      }
    } catch (error) {
      console.error('Error initializing challenge map:', error);
      this.loaded = true; // Still show the container even on error
    }
  },

  // ========================================================================
  // INITIALIZE MAP
  // ========================================================================
  // Sets up province mappings and center coordinates, then maps challenges
  // to provinces and creates the map visualization.
  //
  // CUSTOMIZATION: Adjust province_centers coordinates to reposition icons
  // ========================================================================
  initializeMap() {
    // ====================================================================
    // FRANCE MAP MAPPING - Each department represents a category
    // ====================================================================
    // Departments are dynamically loaded from the France map.
    // Each category will be assigned to a department in order.
    // ====================================================================
    // Get available departments from the map
    const $ = window.$ || window.jQuery;
    const availableDepartments = $ && $.mapael && $.mapael.maps && $.mapael.maps.france && $.mapael.maps.france.elems 
      ? Object.keys($.mapael.maps.france.elems) 
      : [];
    
    // Build provinces object dynamically
    this.provinces = {};
    availableDepartments.forEach((dept, index) => {
      this.provinces[dept] = index + 1;
    });

    // ====================================================================
    // DEPARTMENT CENTER COORDINATES - Calculated from SVG paths
    // ====================================================================
    // These X/Y coordinates determine where challenge dots appear on each department.
    // Coordinates are in the map's SVG coordinate system (0-1000 width, 0-800 height).
    // ====================================================================
    this.province_centers = {
      "department_29": { x: 20.9, y: 97.6 },
      "department_22": { x: 57.1, y: 91.4 },
      "department_56": { x: 59.5, y: 119.0 },
      "department_35": { x: 102.9, y: 96.7 },
      "department_44": { x: 118.0, y: 134.1 },
      "department_50": { x: 101.0, y: 55.1 },
      "department_53": { x: 167.5, y: 104.2 },
      "department_49": { x: 127.0, y: 134.0 },
      "department_85": { x: 125.8, y: 166.5 },
      "department_79": { x: 166.8, y: 165.3 },
      "department_17": { x: 125.5, y: 196.7 },
      "department_33": { x: 133.5, y: 226.4 },
      "department_40": { x: 132.2, y: 273.7 },
      "department_64": { x: 169.3, y: 314.4 },
      "department_65": { x: 174.6, y: 313.7 },
      "department_32": { x: 198.7, y: 295.0 },
      "department_47": { x: 184.8, y: 265.4 },
      "department_31": { x: 234.5, y: 300.3 },
      "department_09": { x: 228.0, y: 327.1 },
      "department_11": { x: 261.9, y: 319.9 },
      "department_34": { x: 318.5, y: 297.4 },
      "department_81": { x: 258.4, y: 288.8 },
      "department_82": { x: 219.3, y: 281.4 },
      "department_12": { x: 278.9, y: 255.8 },
      "department_46": { x: 235.5, y: 253.1 },
      "department_24": { x: 199.4, y: 225.7 },
      "department_16": { x: 203.3, y: 206.5 },
      "department_86": { x: 175.1, y: 161.0 },
      "department_37": { x: 199.3, y: 138.6 },
      "department_72": { x: 187.0, y: 106.8 },
      "department_61": { x: 189.9, y: 87.2 },
      "department_27": { x: 195.0, y: 65.4 },
      "department_14": { x: 183.0, y: 67.7 },
      "department_76": { x: 226.8, y: 39.4 },
      "department_60": { x: 242.4, y: 53.9 },
      "department_80": { x: 236.1, y: 29.0 },
      "department_95": { x: 244.2, y: 78.5 },
      "department_78": { x: 238.7, y: 84.0 },
      "department_28": { x: 232.5, y: 87.6 },
      "department_75": { x: 269.2, y: 91.9 },
      "department_93": { x: 277.2, y: 88.5 },
      "department_94": { x: 273.7, y: 94.7 },
      "department_92": { x: 265.4, y: 91.0 },
      "department_91": { x: 263.4, y: 97.2 },
      "department_45": { x: 258.2, y: 112.3 },
      "department_41": { x: 212.7, y: 122.3 },
      "department_36": { x: 237.6, y: 157.8 },
      "department_18": { x: 261.5, y: 141.1 },
      "department_23": { x: 243.6, y: 193.4 },
      "department_87": { x: 230.7, y: 198.0 },
      "department_19": { x: 255.8, y: 223.0 },
      "department_15": { x: 272.9, y: 234.3 },
      "department_30": { x: 326.6, y: 276.6 },
      "department_48": { x: 306.4, y: 256.8 },
      "department_63": { x: 284.9, y: 201.0 },
      "department_42": { x: 325.4, y: 201.6 },
      "department_69": { x: 356.2, y: 199.5 },
      "department_43": { x: 309.9, y: 236.8 },
      "department_07": { x: 358.5, y: 237.5 },
      "department_26": { x: 366.0, y: 238.4 },
      "department_84": { x: 362.9, y: 279.7 },
      "department_13": { x: 352.2, y: 299.5 },
      "department_83": { x: 424.8, y: 306.3 },
      "department_06": { x: 439.2, y: 281.7 },
      "department_04": { x: 438.4, y: 268.8 },
      "department_05": { x: 417.3, y: 251.6 },
      "department_38": { x: 379.9, y: 216.1 },
      "department_73": { x: 401.6, y: 216.9 },
      "department_74": { x: 429.0, y: 194.3 },
      "department_71": { x: 336.0, y: 161.7 },
      "department_03": { x: 289.5, y: 177.0 },
      "department_58": { x: 295.4, y: 145.7 },
      "department_89": { x: 304.3, y: 110.3 },
      "department_77": { x: 294.3, y: 81.4 },
      "department_10": { x: 339.5, y: 98.5 },
      "department_51": { x: 330.0, y: 68.0 },
      "department_02": { x: 315.8, y: 40.9 },
      "department_59": { x: 270.1, y: 28.8 },
      "department_62": { x: 248.6, y: 0.5 },
      "department_08": { x: 359.0, y: 35.8 },
      "department_55": { x: 383.0, y: 58.7 },
      "department_54": { x: 394.0, y: 61.6 },
      "department_57": { x: 409.6, y: 63.7 },
      "department_67": { x: 445.4, y: 81.7 },
      "department_88": { x: 445.3, y: 105.5 },
      "department_52": { x: 364.9, y: 99.5 },
      "department_70": { x: 409.2, y: 126.9 },
      "department_21": { x: 348.9, y: 125.9 },
      "department_25": { x: 429.4, y: 144.8 },
      "department_2B": { x: 485.7, y: 324.3 },
      "department_2A": { x: 454.5, y: 352.9 },
      "department_66": { x: 282.4, y: 342.7 },
      "department_01": { x: 363.8, y: 188.7 },
      "department_39": { x: 387.6, y: 157.7 },
      "department_68": { x: 452.5, y: 115.0 },
      "department_90": { x: 440.3, y: 138.2 }
    };

    this.provinces_used = [];
    this.chal_areas = {};
    this.categories = [];
    this.category_colors = [];
    this.province_challenges = {};
    this.chal_plots = {};

    this.mapChallengesToProvinces();
    this.createMap();
  },

  // ========================================================================
  // MAP CHALLENGES TO PROVINCES
  // ========================================================================
  // This function assigns each challenge to a province based on its category.
  // Each challenge gets its own clickable icon placed in the province that
  // matches its category name (e.g., "WEB" category → "WEB" province).
  //
  // CUSTOMIZATION AREAS:
  // 1. Category-to-province mapping logic (category name → province code)
  // 2. Icon appearance and styling (lines ~476-516)
  // 3. Icon positioning offsets for multiple challenges in same province
  // 4. Tooltip content (line ~510-512)
  // ========================================================================
  mapChallengesToProvinces() {
    const province_keys = Object.keys(this.provinces);
    
    // Track which categories we've seen and their province assignments
    const categoryToProvince = {};
    const challengesByProvince = {};

    // ====================================================================
    // MAP EACH CHALLENGE TO A PROVINCE BASED ON CATEGORY
    // ====================================================================
    // Each challenge is assigned to a province that matches its category.
    // If a province code matches the category (e.g., "WEB" category → "WEB" province),
    // use that. Otherwise, assign categories to provinces in order.
    // ====================================================================
    this.challenges.forEach((chal, chalIndex) => {
      // Track unique categories
      if (!this.categories.includes(chal.category)) {
        this.categories.push(chal.category);
      }

      // Determine which province this challenge belongs to
      let province = null;
      
      // Assign category to a department in order
      // Each category gets its own department
      const categoryIndex = this.categories.indexOf(chal.category);
      province = province_keys[categoryIndex % province_keys.length];

      // Initialize province tracking if needed
      if (!categoryToProvince[chal.category]) {
        categoryToProvince[chal.category] = province;
        if (!this.provinces_used.includes(province)) {
          this.provinces_used.push(province);
        }
        if (!challengesByProvince[province]) {
          challengesByProvince[province] = [];
        }
        // Configure province area styling
        this.chal_areas[province] = {
          value: chal.category,
          tooltip: {content: `<span style="font-weight:bold;">${chal.category}</span>`}
        };
        // Store first challenge ID for backward compatibility
        this.provinces[province] = chal.id;
      }

      // Add challenge to province
      if (!challengesByProvince[province]) {
        challengesByProvince[province] = [];
      }
      challengesByProvince[province].push(chal);
      
      // Store all challenge IDs for this province
      if (!this.province_challenges[province]) {
        this.province_challenges[province] = [];
      }
      if (!this.province_challenges[province].includes(chal.id)) {
        this.province_challenges[province].push(chal.id);
      }

      // ============================================================
      // CREATE INDIVIDUAL CHALLENGE ICON - ONE PER CHALLENGE
      // ============================================================
      // Each challenge gets its own clickable icon positioned within
      // its category's province. Multiple challenges in the same province
      // are offset to avoid overlap.
      // ============================================================
      const center = this.province_centers[province];
      if (center) {
        // Calculate position for this specific challenge
        const challengesInProvince = challengesByProvince[province];
        const challengeIndexInProvince = challengesInProvince.indexOf(chal);
        const totalInProvince = challengesInProvince.length;
        
        // ========================================================
        // ICON POSITIONING OFFSETS - CUSTOMIZE SPACING
        // ========================================================
        // When multiple challenges are in one province, offset them
        // to avoid overlap. Adjust these multipliers to change spacing:
        // - offsetX: Horizontal spacing (30 = pixels between icons)
        // - offsetY: Vertical spacing (20 = pixels between rows)
        // - Layout: Arrange in a grid or line pattern
        // ========================================================
        // Arrange dots in a grid pattern within the department
        // Use tighter spacing for better containment within departments
        const cols = Math.ceil(Math.sqrt(totalInProvince));
        const row = Math.floor(challengeIndexInProvince / cols);
        const col = challengeIndexInProvince % cols;
        const offsetX = (col - (cols - 1) / 2) * 25; // Horizontal spacing (reduced from 35)
        const offsetY = (row - Math.floor((totalInProvince - 1) / cols) / 2) * 25; // Vertical spacing (reduced from 35)
        
        const plotId = `chal_${chal.id}`;
        const isSolved = chal.solved_by_me || false;
        
        // ========================================================
        // ICON CONFIGURATION - CUSTOMIZE APPEARANCE HERE
        // ========================================================
        // This object defines how each challenge icon appears.
        // Key customization points:
        // - x, y: Icon position (center + offsets)
        // - size: Base size (20 = radius for circles, not used for SVG)
        // - width, height: Icon dimensions in pixels
        // - path: SVG path data (see getFalloutIconPath())
        // - attrs.fill: Icon color (#fff773 = yellow, #0066b1 = blue)
        // - attrs.stroke: Border color (#8b5c29 = brown)
        // - attrs["stroke-width"]: Border thickness
        // - attrs.opacity: Icon transparency (0.0-1.0)
        // - attrsHover: Effects when hovering (transform = scale)
        // - tooltip.content: HTML shown on hover
        // ========================================================
        // ========================================================
        // DOT CONFIGURATION - Simple circle dots for challenges
        // ========================================================
        // Using circles instead of SVG paths for better performance
        // and to avoid hover jumping issues
        // ========================================================
        this.chal_plots[plotId] = {
          x: center.x + offsetX,              // X position on map
          y: center.y + offsetY,             // Y position on map
          size: 12,                          // CUSTOMIZE: Dot radius in pixels (smaller for dots)
          type: "circle",                    // Use circle type for simple dots (no transform issues)
          attrs: {
            fill: isSolved ? "#0066b1" : "#fff773",  // CUSTOMIZE: Dot fill color (solved vs unsolved)
            stroke: "#8b5c29",                       // CUSTOMIZE: Border color (Fallout brown)
            "stroke-width": 2,                       // CUSTOMIZE: Border thickness
            opacity: isSolved ? 0.8 : 1.0            // CUSTOMIZE: Transparency (solved dots slightly faded)
          },
          attrsHover: {
            opacity: 1.0,                           // CUSTOMIZE: Hover opacity
            fill: isSolved ? "#0088dd" : "#ffff99",  // CUSTOMIZE: Hover color (lighter)
            "stroke-width": 3                        // CUSTOMIZE: Thicker border on hover (no transform to avoid jumping)
          },
          tooltip: {
            // CUSTOMIZE: Tooltip HTML content shown on hover
            content: `<span style="font-weight:bold;">${chal.name}</span><br/>${parseInt(chal.value)} points<br/>${chal.category}${isSolved ? '<br/><span style="color:#0066b1;">✓ Solved</span>' : ''}`
          },
          challengeId: chal.id,                      // Challenge ID for click handler
          isSolved: isSolved                         // Whether challenge is solved
        };
      }
    });

    // ====================================================================
    // PROVINCE TAG OVERRIDE - Tags can override category mapping
    // ====================================================================
    // If a challenge has a province tag (e.g., tag "BC"), it will be placed
    // in that province instead of its category's province.
    // ====================================================================
    this.challenges.forEach((chal) => {
      chal.tags.forEach(tag => {
        const provinceCode = tag.value.toUpperCase();
        if (this.provinces.hasOwnProperty(provinceCode)) {
          // Tag overrides category - move challenge to tagged province
          // Remove from original province
          const originalProvince = categoryToProvince[chal.category];
          if (originalProvince && this.province_challenges[originalProvince]) {
            const index = this.province_challenges[originalProvince].indexOf(chal.id);
            if (index > -1) {
              this.province_challenges[originalProvince].splice(index, 1);
            }
          }
          
          // Add to tagged province
          if (!this.province_challenges[provinceCode]) {
            this.province_challenges[provinceCode] = [];
          }
          if (!this.province_challenges[provinceCode].includes(chal.id)) {
            this.province_challenges[provinceCode].push(chal.id);
          }
          
          // Update icon position if it exists
          const plotId = `chal_${chal.id}`;
          if (this.chal_plots[plotId] && this.province_centers[provinceCode]) {
            const center = this.province_centers[provinceCode];
            const challengesInProvince = this.province_challenges[provinceCode];
            const challengeIndex = challengesInProvince.indexOf(chal.id);
            const totalInProvince = challengesInProvince.length;
            
            // Recalculate position in new province
            const cols = Math.ceil(Math.sqrt(totalInProvince));
            const row = Math.floor(challengeIndex / cols);
            const col = challengeIndex % cols;
            const offsetX = (col - (cols - 1) / 2) * 25; // Reduced spacing
            const offsetY = (row - Math.floor((totalInProvince - 1) / cols) / 2) * 25; // Reduced spacing
            
            this.chal_plots[plotId].x = center.x + offsetX;
            this.chal_plots[plotId].y = center.y + offsetY;
          }
          
          // Update province area if not already set
          if (!this.provinces_used.includes(provinceCode)) {
            this.chal_areas[provinceCode] = {
              value: chal.category,
              tooltip: {content: `<span style="font-weight:bold;">${chal.category} ${parseInt(chal.value)}: ${chal.name}</span>`}
            };
            this.provinces_used.push(provinceCode);
            this.provinces[provinceCode] = chal.id;
          }
        }
      });
    });

    // Create category colors
    this.categories.forEach(category => {
      this.category_colors.push({
        attrs: {
          fill: this.colorHash(category)
        },
        label: category,
        sliceValue: category
      });
    });
    
    // If no challenges, still show the map with all provinces (unassigned)
    if (Object.keys(this.chal_areas).length === 0) {
      console.log('No challenges found, showing empty map');
    }
  },

  // ========================================================================
  // COLOR HASH FUNCTION
  // ========================================================================
  // Generates a consistent color from a string (used for category colors).
  // CUSTOMIZE: Change the hash algorithm or use a predefined color palette
  // ========================================================================
  colorHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }
    let color = "";
    const start = hash / 8;
    for (let i = start; i <= hash; i += start) {
      color += i.toString(16).replace(/\W/g, '');
      if (color.length >= 6) {
        break;
      }
    }
    return "#" + color.substring(0, 6);
  },

  // Note: Using simple circles for dots instead of SVG paths to avoid hover jumping issues
  // If you want to customize the dot appearance, change the 'type' and 'size' in chal_plots configuration

  createMap() {
    // Wait for DOM to be ready and container to be visible
    const self = this;
    
    // Wait for Alpine to finish rendering and container to be visible
    const waitForVisible = () => {
      const mapContainer = self.$refs.mapContainer;
      if (!mapContainer) {
        setTimeout(waitForVisible, 50);
        return;
      }
      
      const $ = window.$ || window.jQuery;
      if (!$) {
        setTimeout(waitForVisible, 50);
        return;
      }
      
      const $container = $(mapContainer);
      const $mapDiv = $container.find('.map');
      
      // Check if container and map div are visible
      const containerVisible = $container.is(':visible') && 
                               $container.width() > 0 && 
                               $container.height() > 0 &&
                               window.getComputedStyle(mapContainer).display !== 'none';
      
      const mapDivVisible = $mapDiv.length > 0 && 
                            $mapDiv.is(':visible') &&
                            window.getComputedStyle($mapDiv[0]).display !== 'none';
      
      if (!containerVisible || !mapDivVisible) {
        // Container is hidden, wait a bit and try again
        setTimeout(waitForVisible, 100);
        return;
      }
      
      if (!$.mapael) {
        console.error('jQuery Mapael not loaded');
        return;
      }
      
      if (!$.mapael.maps || !$.mapael.maps.france) {
        console.error('France map definition not found');
        console.log('Available maps:', $.mapael.maps ? Object.keys($.mapael.maps) : 'none');
        return;
      }
      
      try {
        // ====================================================================
        // MAP CONFIGURATION - CUSTOMIZE MAP APPEARANCE AND BEHAVIOR
        // ====================================================================
        // This object configures the jQuery Mapael map. Key sections:
        // - map.defaultArea: Province styling and click handlers
        // - map.defaultPlot: Default icon styling (overridden by chal_plots)
        // - legend: Category color legend
        // - areas: Province area configurations
        // - plots: Challenge icon configurations
        // ====================================================================
        const mapConfig = {
          map: {
            name: "france",            // Map definition name (from islands_map.js - now contains France map)
            cssClass: "map",            // CSS class for map container
            // ================================================================
            // DEFAULT AREA CONFIGURATION - CUSTOMIZE PROVINCE STYLING
            // ================================================================
            // Controls how provinces appear and behave when clicked/hovered
            // ================================================================
            defaultArea: {
              attrs: {
                fill: "#8b5c29",        // CUSTOMIZE: Department fill color (Fallout brown)
                stroke: "#ffe1ba",      // CUSTOMIZE: Department border color (Fallout tan)
                strokeWidth: 2,         // CUSTOMIZE: Border thickness (thicker for visibility)
                cursor: "pointer"       // Cursor style on hover
              },
              text: {
                // CUSTOMIZE: Department label text styling
                attrs: {"font-size": 12, "font-family": "Arial, Helvetica, sans-serif", "fill": "#fff773"},
                attrsHover: {"font-size": 14, "font-family": "Arial, Helvetica, sans-serif", "fill": "#fff773"}
              },
              attrsHover: {
                animDuration: 200,      // CUSTOMIZE: Hover animation duration (ms)
                fill: "#a66d3a",        // CUSTOMIZE: Department color on hover (lighter brown)
              },
              eventHandlers: {
                // CUSTOMIZE: Behavior when clicking a province
                // Note: With individual icons, province clicks are less common.
                // Users typically click the icons directly. This handler is kept
                // for backward compatibility and for provinces with many challenges.
                click: (e, id, mapElem, textElem) => {
                  if (!self.provinces_used.includes(id)) {
                    console.log('Province', id, 'has no challenges assigned');
                    return;
                  }
                  
                  // Get all challenges for this province
                  const challengeIds = self.province_challenges[id] || [self.provinces[id]];
                  
                  if (challengeIds.length === 1) {
                    // Single challenge, load it directly
                    self.loadChallenge(challengeIds[0]);
                  } else {
                    // Multiple challenges, show selection modal
                    self.showChallengeSelection(id, challengeIds);
                  }
                }
              }
            },
            // ================================================================
            // DEFAULT PLOT CONFIGURATION - CUSTOMIZE DEFAULT ICON STYLING
            // ================================================================
            // These are defaults for icons. Individual icons in chal_plots
            // override these settings. Useful for fallback styling.
            // ================================================================
            defaultPlot: {
              size: 12,                 // CUSTOMIZE: Default dot size (radius)
              attrs: {
                fill: "#fff773",         // CUSTOMIZE: Default dot fill (Fallout yellow)
                stroke: "#8b5c29",       // CUSTOMIZE: Default border (Fallout brown)
                "stroke-width": 2        // CUSTOMIZE: Default border thickness
              },
              attrsHover: {
                opacity: 1.0,            // CUSTOMIZE: Hover opacity
                fill: "#ffff99",         // CUSTOMIZE: Hover color (lighter yellow)
                "stroke-width": 3        // CUSTOMIZE: Thicker border on hover (no transform to avoid jumping)
              },
              eventHandlers: {
                // CUSTOMIZE: Behavior when clicking an icon
                // Currently: Opens the associated challenge
                click: function(e, id, mapElem, textElem) {
                  const plot = self.chal_plots[id];
                  if (plot && plot.challengeId) {
                    self.loadChallenge(plot.challengeId);
                  }
                }
              }
            }
          },
          // ================================================================
          // LEGEND CONFIGURATION - CUSTOMIZE CATEGORY COLOR LEGEND
          // ================================================================
          // Controls the legend showing challenge categories and their colors
          // ================================================================
          legend: {
            area: {
              title: "Categories",       // CUSTOMIZE: Legend title
              slices: self.category_colors // Color slices (generated in mapChallengesToProvinces)
            }
          },
          areas: self.chal_areas,         // Province area configurations
          plots: self.chal_plots,         // Challenge icon configurations
        };
        
        console.log('Creating map with config:', mapConfig);
        console.log('Areas to render:', Object.keys(self.chal_areas));
        console.log('Plots to render:', Object.keys(self.chal_plots));
        console.log('Map container:', mapContainer);
        console.log('Container dimensions:', $container.width(), 'x', $container.height());
        console.log('Map div dimensions:', $mapDiv.width(), 'x', $mapDiv.height());
        
        const mapaelInstance = $(mapContainer).mapael(mapConfig);
        
        // Add checkmarks for solved challenges after map is created
        // Use setTimeout to ensure map is fully rendered
        setTimeout(() => {
          self.addCheckmarksToSolvedChallenges($(mapContainer));
        }, 200);
        
        console.log('Map created successfully');
      } catch (error) {
        console.error('Error creating map:', error);
        console.error('Error stack:', error.stack);
      }
    };
    
    // Start waiting after Alpine has processed
    this.$nextTick(() => {
      // Give Alpine a moment to show the container
      setTimeout(waitForVisible, 100);
    });
  },

  async loadChallenges() {
    this.challenges = await CTFd.pages.challenges.getChallenges();
    this.initializeMap();
  },

  // ========================================================================
  // SHOW CHALLENGE SELECTION MODAL
  // ========================================================================
  // Displays a modal when a province has multiple challenges.
  // Allows user to select which challenge to open.
  //
  // CUSTOMIZE MODAL APPEARANCE:
  // - Modify modalHtml template to change layout/styling
  // - Add challenge descriptions, difficulty indicators, etc.
  // - Change button styling or add icons
  // ========================================================================
  async showChallengeSelection(provinceCode, challengeIds) {
    // Get challenge details for all challenges in this province
    const challenges = this.challenges.filter(chal => challengeIds.includes(chal.id));
    
    if (challenges.length === 0) return;
    
    // ====================================================================
    // MODAL HTML TEMPLATE - CUSTOMIZE MODAL LAYOUT
    // ====================================================================
    // This template creates the challenge selection modal.
    // Customize:
    // - Add challenge descriptions: ${chal.description}
    // - Add difficulty indicators: ${chal.difficulty}
    // - Add solved status indicators
    // - Change button styling or add icons
    // - Modify the list-group-item structure
    // ====================================================================
    const modalHtml = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Select Challenge - ${provinceCode}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>This province has ${challenges.length} challenge${challenges.length > 1 ? 's' : ''}:</p>
            <div class="list-group">
              ${challenges.map(chal => `
                <button type="button" class="list-group-item list-group-item-action" data-challenge-id="${chal.id}">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${chal.name}</h6>
                    <small>${parseInt(chal.value)} points</small>
                  </div>
                  <p class="mb-1">${chal.category}</p>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Create temporary modal for selection
    const tempModal = document.createElement('div');
    tempModal.className = 'modal fade';
    tempModal.id = 'challenge-selection-modal';
    tempModal.innerHTML = modalHtml;
    document.body.appendChild(tempModal);
    
    const selectionModal = new Modal(tempModal, {
      backdrop: true,
      keyboard: true
    });
    
    // Store challenge ID to load after modal closes
    let selectedChallengeId = null;
    
    // Add click handlers
    tempModal.querySelectorAll('[data-challenge-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedChallengeId = parseInt(btn.getAttribute('data-challenge-id'));
        selectionModal.hide();
      });
    });
    
    // Clean up and load challenge after modal is hidden
    const handleModalHidden = (event) => {
      // Load the selected challenge if one was chosen
      if (selectedChallengeId) {
        // Use setTimeout to ensure modal animation is complete
        setTimeout(() => {
          this.loadChallenge(selectedChallengeId);
        }, 150);
      }
      
      // Dispose of the modal instance
      try {
        selectionModal.dispose();
      } catch (e) {
        // Ignore dispose errors
      }
      
      // Clean up modal element after a delay to ensure Bootstrap is done
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // Check if element still exists and has a parent before removing
            if (tempModal && tempModal.isConnected && tempModal.parentNode) {
              tempModal.remove();
            }
          } catch (e) {
            // Element may have already been removed, ignore error silently
          }
        });
      });
    };
    
    tempModal.addEventListener('hidden.bs.modal', handleModalHidden, { once: true });
    
    selectionModal.show();
  },

  // ========================================================================
  // ADD CHECKMARKS TO SOLVED CHALLENGES
  // ========================================================================
  // Draws checkmark overlays on solved challenge icons.
  // This is called after the map is rendered.
  //
  // CUSTOMIZE CHECKMARK APPEARANCE:
  // - Change the SVG path to modify checkmark shape
  // - Adjust stroke color, width, and style
  // - Modify position offsets (plot.x - 10, etc.)
  // - Add fill color for a filled checkmark
  // - Change to a different symbol (X, star, etc.)
  // ========================================================================
  addCheckmarksToSolvedChallenges($mapContainer) {
    // Add checkmark overlays for solved challenges
    const self = this;
    Object.keys(this.chal_plots).forEach(plotId => {
      const plot = this.chal_plots[plotId];
      if (plot && plot.isSolved) {
        // Get the mapael instance (contains Raphael paper for drawing)
        const mapaelInstance = $mapContainer.data('mapael');
        if (mapaelInstance && mapaelInstance.paper) {
          const paper = mapaelInstance.paper;
          // ================================================================
          // CHECKMARK PATH - CUSTOMIZE SHAPE AND POSITION
          // ================================================================
          // Current: Simple checkmark path
          // Path format: "M x,y L x,y L x,y" (Move, Line, Line)
          // - plot.x - 10, plot.y: Start of checkmark (left side)
          // - plot.x - 2, plot.y + 8: Middle point (bottom of check)
          // - plot.x + 10, plot.y - 8: End point (top right)
          //
          // To customize:
          // - Adjust offsets (-10, +8, etc.) to change position/size
          // - Change path to create different shapes (X, star, circle, etc.)
          // - Example X mark: "M x-8,y-8 L x+8,y+8 M x+8,y-8 L x-8,y+8"
          // ================================================================
          const checkmark = paper.path(`M ${plot.x - 10},${plot.y} L ${plot.x - 2},${plot.y + 8} L ${plot.x + 10},${plot.y - 8}`)
            .attr({
              stroke: "#0066b1",         // CUSTOMIZE: Checkmark color (Fallout light blue)
              "stroke-width": 4,          // CUSTOMIZE: Checkmark thickness
              "stroke-linecap": "round",  // CUSTOMIZE: Line end style ("round", "square", "butt")
              "stroke-linejoin": "round", // CUSTOMIZE: Line join style ("round", "miter", "bevel")
              "fill": "none"              // CUSTOMIZE: Fill color (use "none" or a color like "#0066b1")
            });
          // Store checkmark reference for potential cleanup/updates
          plot.checkmark = checkmark;
        }
      }
    });
  },

  async loadChallenge(challengeId) {
    await CTFd.pages.challenge.displayChallenge(challengeId, challenge => {
      challenge.data.view = addTargetBlank(challenge.data.view);
      Alpine.store("challenge").data = challenge.data;

      // nextTick is required here because we're working in a callback
      Alpine.nextTick(() => {
        let modal = Modal.getOrCreateInstance("[x-ref='challengeWindow']");
        // TODO: Get rid of this private attribute access
        // See https://github.com/twbs/bootstrap/issues/31266
        modal._element.addEventListener(
          "hidden.bs.modal",
          event => {
            // Remove location hash
            history.replaceState(null, null, " ");
            // Refresh map to show updated solved status
            self.initializeMap();
          },
          { once: true },
        );
        modal.show();
        history.replaceState(null, null, `#${challenge.data.name}-${challengeId}`);
      });
    });
  },
}));

Alpine.start();
