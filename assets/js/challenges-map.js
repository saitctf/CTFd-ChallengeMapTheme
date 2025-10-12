import Alpine from "alpinejs";
import dayjs from "dayjs";

import CTFd from "./index";

import { Modal, Tab, Tooltip } from "bootstrap";
import highlight from "./theme/highlight";

// Load map libraries dynamically
function loadMapLibraries() {
  return new Promise((resolve) => {
    if (window.Raphael && window.jQuery && window.jQuery.mapael) {
      resolve();
      return;
    }

    const scripts = [
      '/themes/CTFd-ChallengeMapTheme/static/assets/raphael.min.js',
      '/themes/CTFd-ChallengeMapTheme/static/assets/jquery.mapael.js',
      '/themes/CTFd-ChallengeMapTheme/static/assets/usa_states.js'
    ];

    let loaded = 0;
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length) {
          resolve();
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

// US Map functionality
Alpine.data("ChallengeMap", () => ({
  loaded: false,
  challenges: [],
  challenge: null,
  states: {},
  states_used: [],
  chal_areas: {},
  categories: [],
  category_colors: [],

  async init() {
    this.challenges = await CTFd.pages.challenges.getChallenges();
    
    // Load map libraries and initialize map
    await loadMapLibraries();
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
  },

  initializeMap() {
    // Initialize states mapping
    this.states = {
      'DE':1, 'PA':2, 'NJ':3, 'GA':4,
      'CT':5, 'MA':6, 'MD':7, 'SC':8,
      'NH':9, 'VA':10, 'NY':11, 'NC':12,
      'RI':13, 'VT':14, 'KY':15, 'TN':16,
      'OH':17, 'LA':18, 'IN':19, 'MS':20,
      'IL':21, 'AL':22, 'ME':23, 'MO':24,
      'AR':25, 'MI':26, 'FL':27, 'TX':28,
      'IA':29, 'WI':30, 'CA':31, 'MN':32,
      'OR':33, 'KS':34, 'WV':35, 'NV':36,
      'NE':37, 'CO':38, 'ND':39, 'SD':40,
      'MT':41, 'WA':42, 'ID':43, 'WY':44,
      'UT':45, 'OK':46, 'NM':47, 'AZ':48,
      'AK':49, 'HI':50
    };

    this.states_used = [];
    this.chal_areas = {};
    this.categories = [];
    this.category_colors = [];

    this.mapChallengesToStates();
    this.createMap();
  },

  mapChallengesToStates() {
    const state_keys = Object.keys(this.states);
    const chals_used = [];

    this.challenges.forEach((chal, index) => {
      // Add category if not already present
      if (!this.categories.includes(chal.category)) {
        this.categories.push(chal.category);
      }

      // Check if challenge has state tags
      let state_assigned = false;
      chal.tags.forEach(tag => {
        if (this.states[tag.value] && !this.states_used.includes(tag.value)) {
          this.chal_areas[tag.value] = {
            value: chal.category,
            tooltip: {content: `<span style="font-weight:bold;">${chal.category} ${parseInt(chal.value)}: ${chal.name}</span>`}
          };
          this.states_used.push(tag.value);
          this.states[tag.value] = chal.id;
          chals_used.push(chal.id);
          state_assigned = true;
        }
      });

      // If no state tag, assign to default state
      if (!state_assigned) {
        const default_state = state_keys[index % state_keys.length];
        if (!this.states_used.includes(default_state)) {
          this.chal_areas[default_state] = {
            value: chal.category,
            tooltip: {content: `<span style="font-weight:bold;">${chal.category} ${parseInt(chal.value)}: ${chal.name}</span>`}
          };
          this.states_used.push(default_state);
          this.states[default_state] = chal.id;
          chals_used.push(chal.id);
        }
      }
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
      if (mapContainer && window.jQuery && window.jQuery.mapael) {
        $(mapContainer).mapael({
          map: {
            name: "usa_states",
            defaultArea: {
              attrs: {
                fill: "#eee",
                stroke: "#ddd",
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
                  if (!this.states_used.includes(id)) return;
                  const chalid = this.states[id];
                  this.loadChallenge(chalid);
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
        });
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
