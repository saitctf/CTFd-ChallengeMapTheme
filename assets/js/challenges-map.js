import Alpine from "alpinejs";
import dayjs from "dayjs";

import CTFd from "./index";

import { Modal, Tab, Tooltip } from "bootstrap";
import highlight from "./theme/highlight";

// Load map libraries dynamically
function loadMapLibraries() {
  return new Promise((resolve, reject) => {
    if (window.Raphael && window.jQuery && window.jQuery.mapael && window.jQuery.mapael.maps && window.jQuery.mapael.maps.canada_provinces) {
      resolve();
      return;
    }

    const scripts = [
      '/themes/CTFd-ChallengeMapTheme/static/assets/raphael.min.js',
      '/themes/CTFd-ChallengeMapTheme/static/assets/jquery.mapael.js',
      '/themes/CTFd-ChallengeMapTheme/static/assets/canada_provinces.js'
    ];

    let loaded = 0;
    let hasError = false;
    
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loaded++;
        // Check if all scripts loaded and map is registered
        if (loaded === scripts.length) {
          // Give a small delay to ensure map is registered
          setTimeout(() => {
            if (window.jQuery && window.jQuery.mapael && window.jQuery.mapael.maps && window.jQuery.mapael.maps.canada_provinces) {
              resolve();
            } else {
              console.error('Canada provinces map not found after loading scripts');
              reject(new Error('Map definition not found'));
            }
          }, 100);
        }
      };
      script.onerror = () => {
        if (!hasError) {
          hasError = true;
          console.error('Failed to load script:', src);
          reject(new Error(`Failed to load script: ${src}`));
        }
      };
      document.head.appendChild(script);
    });
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

// Canada Map functionality
Alpine.data("ChallengeMap", () => ({
  loaded: false,
  challenges: [],
  challenge: null,
  provinces: {},
  provinces_used: [],
  chal_areas: {},
  categories: [],
  category_colors: [],

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

  initializeMap() {
    // Initialize provinces mapping (Canada: 10 provinces + 3 territories)
    this.provinces = {
      'AB':1, 'BC':2, 'MB':3, 'NB':4,
      'NL':5, 'NS':6, 'ON':7, 'PE':8,
      'QC':9, 'SK':10, 'NT':11, 'NU':12,
      'YT':13
    };

    this.provinces_used = [];
    this.chal_areas = {};
    this.categories = [];
    this.category_colors = [];

    this.mapChallengesToProvinces();
    this.createMap();
  },

  mapChallengesToProvinces() {
    const province_keys = Object.keys(this.provinces);
    const chals_used = [];

    // Group challenges by category
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

    // Map each category to a province
    this.categories.forEach((category, index) => {
      const province = province_keys[index % province_keys.length];
      
      if (!this.provinces_used.includes(province)) {
        // Get the first challenge in this category
        const categoryChallenges = challengesByCategory[category];
        if (categoryChallenges && categoryChallenges.length > 0) {
          const firstChallenge = categoryChallenges[0];
          this.chal_areas[province] = {
            value: category,
            tooltip: {content: `<span style="font-weight:bold;">${category}</span><br/>${categoryChallenges.length} challenge${categoryChallenges.length > 1 ? 's' : ''}`}
          };
          this.provinces_used.push(province);
          // Store the first challenge ID for clicking
          this.provinces[province] = firstChallenge.id;
        }
      }
    });

    // Also check for province tags on individual challenges (override category mapping)
    this.challenges.forEach((chal) => {
      chal.tags.forEach(tag => {
        const provinceCode = tag.value.toUpperCase();
        if (this.provinces.hasOwnProperty(provinceCode) && !this.provinces_used.includes(provinceCode)) {
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

  createMap() {
    // Wait for DOM to be ready
    this.$nextTick(() => {
      const mapContainer = this.$refs.mapContainer;
      if (!mapContainer) {
        console.error('Map container not found');
        return;
      }
      
      if (!window.jQuery) {
        console.error('jQuery not loaded');
        return;
      }
      
      if (!window.jQuery.mapael) {
        console.error('jQuery Mapael not loaded');
        return;
      }
      
      if (!window.jQuery.mapael.maps || !window.jQuery.mapael.maps.canada_provinces) {
        console.error('Canada provinces map definition not found');
        console.log('Available maps:', window.jQuery.mapael.maps ? Object.keys(window.jQuery.mapael.maps) : 'none');
        return;
      }
      
      try {
        const mapConfig = {
          map: {
            name: "canada_provinces",
            defaultArea: {
              attrs: {
                fill: "#eee",
                stroke: "#ddd",
                strokeWidth: 1,
                cursor: "pointer"
              },
              text: {
                attrs: {"font-size": 10, "font-family": "Arial, Helvetica, sans-serif"},
                attrsHover: {"font-size": 14, "font-family": "Arial, Helvetica, sans-serif"}
              },
              attrsHover: {
                animDuration: 200,
                fill: "#555",
              },
              eventHandlers: {
                click: (e, id, mapElem, textElem) => {
                  if (!this.provinces_used.includes(id)) {
                    console.log('Province', id, 'has no challenges assigned');
                    return;
                  }
                  const chalid = this.provinces[id];
                  if (chalid) {
                    this.loadChallenge(chalid);
                  }
                }
              }
            }
          },
          legend: {
            area: {
              title: "Categories",
              slices: this.category_colors
            }
          },
          areas: this.chal_areas,
        };
        
        console.log('Creating map with config:', mapConfig);
        console.log('Areas to render:', Object.keys(this.chal_areas));
        
        $(mapContainer).mapael(mapConfig);
        
        console.log('Map created successfully');
      } catch (error) {
        console.error('Error creating map:', error);
        console.error('Error stack:', error.stack);
      }
    });
  },

  async loadChallenges() {
    this.challenges = await CTFd.pages.challenges.getChallenges();
    this.initializeMap();
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
