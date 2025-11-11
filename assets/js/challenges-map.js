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
    if (window.Raphael && $ && $.mapael && $.mapael.maps && $.mapael.maps.canada_provinces) {
      resolve();
      return;
    }

    // Scripts should be loaded in template, just wait for them
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait (increased for slower connections)
    
    const checkInterval = setInterval(() => {
      attempts++;
      const $ = getJQuery();
      
      if (window.Raphael && $ && $.mapael && $.mapael.maps && $.mapael.maps.canada_provinces) {
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
    // Initialize provinces mapping (Canada: 10 provinces + 3 territories)
    // This is used for category-to-province assignment
    // CUSTOMIZE: Add/remove provinces or change the order
    this.provinces = {
      'AB':1, 'BC':2, 'MB':3, 'NB':4,
      'NL':5, 'NS':6, 'ON':7, 'PE':8,
      'QC':9, 'SK':10, 'NT':11, 'NU':12,
      'YT':13
    };

    // ====================================================================
    // PROVINCE CENTER COORDINATES - CUSTOMIZE ICON POSITIONS HERE
    // ====================================================================
    // These X/Y coordinates determine where challenge icons appear on the map.
    // Coordinates are in the map's SVG coordinate system (0-1000 width, 0-800 height).
    // 
    // To adjust icon positions:
    // - Increase X to move right, decrease to move left
    // - Increase Y to move down, decrease to move up
    // - Adjust these values to center icons better within each province
    // ====================================================================
    this.province_centers = {
      'BC': { x: 200, y: 350 },   // British Columbia
      'AB': { x: 235, y: 340 },   // Alberta
      'SK': { x: 345, y: 340 },   // Saskatchewan
      'MB': { x: 447, y: 340 },   // Manitoba
      'ON': { x: 560, y: 360 },  // Ontario
      'QC': { x: 657, y: 360 },  // Quebec
      'NB': { x: 705, y: 360 },  // New Brunswick
      'NS': { x: 710, y: 380 },  // Nova Scotia
      'PE': { x: 700, y: 355 },  // Prince Edward Island
      'NL': { x: 765, y: 330 },  // Newfoundland and Labrador
      'YT': { x: 115, y: 150 },  // Yukon
      'NT': { x: 220, y: 200 },  // Northwest Territories
      'NU': { x: 360, y: 200 }   // Nunavut
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
  // This function assigns challenges to provinces based on categories.
  // It also creates the icon/plot configurations for each challenge.
  //
  // CUSTOMIZATION AREAS:
  // 1. Category-to-province mapping logic (lines ~374-431)
  // 2. Icon appearance and styling (lines ~403-426)
  // 3. Icon positioning offsets for multiple challenges (lines ~397-398)
  // 4. Tooltip content (line ~421-422)
  // ========================================================================
  mapChallengesToProvinces() {
    const province_keys = Object.keys(this.provinces);
    const chals_used = [];

    // Group challenges by category
    // CUSTOMIZE: Change how challenges are grouped (e.g., by tags, difficulty, etc.)
    const challengesByCategory = {};
    this.challenges.forEach(chal => {
      if (!this.categories.includes(chal.category)) {
        this.categories.push(chal.category);
      }
      if (!challengesByCategory[chal.category]) {
        challengesByCategory[chal.category] = [];
      }
      challengesByCategory[chal.category].push(chal);
    });

    // ====================================================================
    // CATEGORY-TO-PROVINCE MAPPING - CUSTOMIZE ASSIGNMENT LOGIC HERE
    // ====================================================================
    // Currently: Each category is assigned to a province in order.
    // To customize:
    // - Change the assignment algorithm (e.g., round-robin, by category name, etc.)
    // - Add custom mapping logic based on category names
    // - Use challenge tags to override category mapping
    // ====================================================================
    this.categories.forEach((category, index) => {
      const province = province_keys[index % province_keys.length];
      
      if (!this.provinces_used.includes(province)) {
        // Get all challenges in this category
        const categoryChallenges = challengesByCategory[category];
        if (categoryChallenges && categoryChallenges.length > 0) {
          // Store all challenge IDs for this province
          this.province_challenges[province] = categoryChallenges.map(chal => chal.id);
          
          // Configure province area styling (hover effects, colors)
          this.chal_areas[province] = {
            value: category,
            tooltip: {content: `<span style="font-weight:bold;">${category}</span><br/>${categoryChallenges.length} challenge${categoryChallenges.length > 1 ? 's' : ''}`}
          };
          this.provinces_used.push(province);
          // Store the first challenge ID for backward compatibility
          this.provinces[province] = categoryChallenges[0].id;
          
          // ============================================================
          // CREATE CHALLENGE ICONS/PLOTS - CUSTOMIZE ICON APPEARANCE
          // ============================================================
          // This loop creates a Fallout-themed icon for each challenge.
          // Each icon is positioned at the province center with offsets
          // for multiple challenges.
          // ============================================================
          const center = this.province_centers[province];
          if (center) {
            categoryChallenges.forEach((chal, chalIndex) => {
              // ========================================================
              // ICON POSITIONING OFFSETS - CUSTOMIZE SPACING
              // ========================================================
              // When multiple challenges are in one province, offset them
              // to avoid overlap. Adjust these multipliers to change spacing:
              // - offsetX: Horizontal spacing (30 = pixels between icons)
              // - offsetY: Vertical spacing (20 = pixels between rows)
              // ========================================================
              const offsetX = categoryChallenges.length > 1 ? (chalIndex - (categoryChallenges.length - 1) / 2) * 30 : 0;
              const offsetY = categoryChallenges.length > 1 ? (chalIndex % 2) * 20 : 0;
              
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
              this.chal_plots[plotId] = {
                x: center.x + offsetX,              // X position on map
                y: center.y + offsetY,             // Y position on map
                size: 20,                          // Base size (for circles)
                type: "svg",                       // Icon type: "svg", "circle", "square", or "image"
                width: 24,                         // Icon width in pixels
                height: 24,                        // Icon height in pixels
                path: this.getFalloutIconPath(),   // SVG path data (see getFalloutIconPath())
                attrs: {
                  fill: isSolved ? "#0066b1" : "#fff773",  // CUSTOMIZE: Icon fill color (solved vs unsolved)
                  stroke: "#8b5c29",                       // CUSTOMIZE: Border color (Fallout brown)
                  "stroke-width": 2,                       // CUSTOMIZE: Border thickness
                  opacity: isSolved ? 0.8 : 1.0            // CUSTOMIZE: Transparency (solved icons slightly faded)
                },
                attrsHover: {
                  opacity: 1.0,                           // CUSTOMIZE: Hover opacity
                  transform: "s1.2"                        // CUSTOMIZE: Hover scale (s1.2 = 120% size)
                },
                tooltip: {
                  // CUSTOMIZE: Tooltip HTML content shown on hover
                  content: `<span style="font-weight:bold;">${chal.name}</span><br/>${parseInt(chal.value)} points<br/>${chal.category}${isSolved ? '<br/><span style="color:#0066b1;">✓ Solved</span>' : ''}`
                },
                challengeId: chal.id,                      // Challenge ID for click handler
                isSolved: isSolved                         // Whether challenge is solved
              };
            });
          }
        }
      }
    });

    // Also check for province tags on individual challenges (override category mapping)
    this.challenges.forEach((chal) => {
      chal.tags.forEach(tag => {
        const provinceCode = tag.value.toUpperCase();
        if (this.provinces.hasOwnProperty(provinceCode) && !this.provinces_used.includes(provinceCode)) {
          // Initialize array if it doesn't exist
          if (!this.province_challenges[provinceCode]) {
            this.province_challenges[provinceCode] = [];
          }
          // Add this challenge to the province
          if (!this.province_challenges[provinceCode].includes(chal.id)) {
            this.province_challenges[provinceCode].push(chal.id);
          }
          
          this.chal_areas[provinceCode] = {
            value: chal.category,
            tooltip: {content: `<span style="font-weight:bold;">${chal.category} ${parseInt(chal.value)}: ${chal.name}</span>`}
          };
          this.provinces_used.push(provinceCode);
          this.provinces[provinceCode] = chal.id;
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

  // ========================================================================
  // GET FALLOUT ICON PATH
  // ========================================================================
  // Returns the SVG path data for the Fallout radiation symbol icon.
  // This is the icon that appears on the map for each challenge.
  //
  // CUSTOMIZE ICON DESIGN:
  // - Replace this path with a different SVG path for a custom icon
  // - Use SVG path tools (like Inkscape, Illustrator) to create new paths
  // - Path format: "M x,y L x,y ..." (Move, Line, Arc, etc.)
  // - Coordinates are relative to a 24x24 viewBox (0-24 range)
  //
  // Examples:
  // - Vault door: Create a circular door with gear teeth
  // - Pip-Boy: Create a wristwatch-like icon
  // - Nuka-Cola bottle: Create a bottle shape
  // - Custom symbol: Any SVG path you design
  // ========================================================================
  getFalloutIconPath() {
    // Radiation symbol - three blades with circle in center
    // This creates the classic Fallout radiation warning symbol
    // Path breakdown:
    // - M = Move to point
    // - L = Line to point
    // - A = Arc (for the circle)
    // - Z = Close path
    return "M 12,2 L 12,6 M 12,18 L 12,22 M 2,12 L 6,12 M 18,12 L 22,12 M 4.343,4.343 L 7.071,7.071 M 16.929,16.929 L 19.657,19.657 M 4.343,19.657 L 7.071,16.929 M 16.929,7.071 L 19.657,4.343 M 12,8 A 4,4 0 0,1 12,16 A 4,4 0 0,1 12,8 Z";
  },

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
      
      if (!$.mapael.maps || !$.mapael.maps.canada_provinces) {
        console.error('Canada provinces map definition not found');
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
            name: "canada_provinces",  // Map definition name (from canada_provinces.js)
            cssClass: "map",            // CSS class for map container
            // ================================================================
            // DEFAULT AREA CONFIGURATION - CUSTOMIZE PROVINCE STYLING
            // ================================================================
            // Controls how provinces appear and behave when clicked/hovered
            // ================================================================
            defaultArea: {
              attrs: {
                fill: "#001423",        // CUSTOMIZE: Province fill color (Fallout dark blue)
                stroke: "#8b5c29",      // CUSTOMIZE: Province border color (Fallout brown)
                strokeWidth: 1,         // CUSTOMIZE: Border thickness
                cursor: "pointer"       // Cursor style on hover
              },
              text: {
                // CUSTOMIZE: Province label text styling
                attrs: {"font-size": 10, "font-family": "Arial, Helvetica, sans-serif"},
                attrsHover: {"font-size": 14, "font-family": "Arial, Helvetica, sans-serif"}
              },
              attrsHover: {
                animDuration: 200,      // CUSTOMIZE: Hover animation duration (ms)
                fill: "#001a2e",        // CUSTOMIZE: Province color on hover (lighter dark blue)
              },
              eventHandlers: {
                // CUSTOMIZE: Behavior when clicking a province
                // Currently: Opens challenge(s) or shows selection modal
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
              size: 20,                 // CUSTOMIZE: Default icon size
              attrs: {
                fill: "#fff773",         // CUSTOMIZE: Default icon fill (Fallout yellow)
                stroke: "#8b5c29",       // CUSTOMIZE: Default border (Fallout brown)
                "stroke-width": 2        // CUSTOMIZE: Default border thickness
              },
              attrsHover: {
                opacity: 1.0,            // CUSTOMIZE: Hover opacity
                transform: "s1.2"        // CUSTOMIZE: Hover scale (s1.2 = 120%)
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
