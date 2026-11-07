/**
 * The browser copy of the platform's own ranking code — not a second implementation.
 *
 * This file imports the same engines.ts and spine.ts that scripts/film-run.mjs runs against, so a
 * visitor who moves a control on the Engines or Mission page is ranking with the gates that decided
 * a real render on Master's machine. If a page and the pipeline ever disagree, the disagreement is a
 * bug in the page, because the page has no logic of its own.
 */
import { ENGINES, escapeRoutes, quoteFor, rankEngines, rankLines } from "../src/lib/apex/engines.ts";
import { SPINE, contextFor, dictionaryShape, handoffFor, missionFromIdea, nextAction, planMission } from "../src/lib/apex/spine.ts";

window.APEX_ENGINES = { ENGINES, rankEngines, escapeRoutes, quoteFor, rankLines };
window.APEX_SPINE = { SPINE, contextFor, dictionaryShape, handoffFor, missionFromIdea, nextAction, planMission };
