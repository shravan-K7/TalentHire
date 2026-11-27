import { useEffect, useState, useMemo } from "react";
import { MapPin, Plus, X, Globe2 } from "lucide-react";
import {
  fetchIndianStates,
  fetchDistrictsByState,
  fetchCitiesByDistrict,
} from "../../services/locationService";
import "./ArtistLocationCoverageFields.css";

/**
 * Shared Base Location & Multi-State/Multi-District Travel Coverage selector
 * used in both ArtistRegistration and ArtistDashboard profile editing.
 */
export default function ArtistLocationCoverageFields({
  stateId,
  districtId,
  cityId,
  serviceDistrictIds = [],
  initialServiceStates = [],
  legacyLocation = "",
  onBaseLocationChange,
  onServiceDistrictsChange,
  errors = {},
}) {
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(true);

  const [baseDistricts, setBaseDistricts] = useState([]);
  const [baseDistrictsLoading, setBaseDistrictsLoading] = useState(false);

  const [baseCities, setBaseCities] = useState([]);
  const [baseCitiesLoading, setBaseCitiesLoading] = useState(false);

  // Cache of districts per stateId: { [stateId]: [{ id, name, state_id }] }
  const [districtsByState, setDistrictsByState] = useState({});
  const [loadingStateIds, setLoadingStateIds] = useState({});

  // Ordered list of state IDs currently expanded in "Where are you available for bookings?"
  const [selectedStateIds, setSelectedStateIds] = useState(() => {
    const ids = (initialServiceStates || []).map((s) => String(s.id));
    if (stateId && !ids.includes(String(stateId))) {
      ids.unshift(String(stateId));
    }
    return ids;
  });

  // State ID in the "Add another state" dropdown
  const [stateToAdd, setStateToAdd] = useState("");

  // Load all Indian states/UTs once
  useEffect(() => {
    let ignore = false;
    async function loadStates() {
      setStatesLoading(true);
      const res = await fetchIndianStates();
      if (!ignore) {
        setStates(res.states || []);
        setStatesLoading(false);
      }
    }
    loadStates();
    return () => {
      ignore = true;
    };
  }, []);

  // Sync initialServiceStates when profile data finishes loading asynchronously
  useEffect(() => {
    setSelectedStateIds((prev) => {
      const next = [...prev];
      (initialServiceStates || []).forEach((s) => {
        const sid = String(s.id);
        if (!next.includes(sid)) {
          next.push(sid);
        }
      });
      if (stateId && !next.includes(String(stateId))) {
        next.unshift(String(stateId));
      }
      return next;
    });
  }, [initialServiceStates, stateId]);

  // Load districts for base state
  useEffect(() => {
    let ignore = false;
    if (!stateId) {
      setBaseDistricts([]);
      return;
    }
    async function loadBaseDistricts() {
      setBaseDistrictsLoading(true);
      const res = await fetchDistrictsByState(stateId);
      if (!ignore) {
        const list = res.districts || [];
        setBaseDistricts(list);
        setDistrictsByState((prev) => ({ ...prev, [String(stateId)]: list }));
        setBaseDistrictsLoading(false);
      }
    }
    loadBaseDistricts();
    return () => {
      ignore = true;
    };
  }, [stateId]);

  // Load optional cities for base district
  useEffect(() => {
    let ignore = false;
    if (!districtId) {
      setBaseCities([]);
      return;
    }
    async function loadBaseCities() {
      setBaseCitiesLoading(true);
      const res = await fetchCitiesByDistrict(districtId);
      if (!ignore) {
        setBaseCities(res.cities || []);
        setBaseCitiesLoading(false);
      }
    }
    loadBaseCities();
    return () => {
      ignore = true;
    };
  }, [districtId]);

  // Load districts for every selected coverage state that isn't cached yet
  useEffect(() => {
    selectedStateIds.forEach((sid) => {
      if (!sid || districtsByState[sid] || loadingStateIds[sid]) return;
      setLoadingStateIds((prev) => ({ ...prev, [sid]: true }));
      fetchDistrictsByState(sid).then((res) => {
        setDistrictsByState((prev) => ({ ...prev, [sid]: res.districts || [] }));
        setLoadingStateIds((prev) => ({ ...prev, [sid]: false }));
      });
    });
  }, [selectedStateIds, districtsByState, loadingStateIds]);

  const statesMap = useMemo(() => {
    const map = {};
    states.forEach((s) => {
      map[String(s.id)] = s;
    });
    return map;
  }, [states]);

  const normalizedServiceIds = useMemo(() => {
    const set = new Set((serviceDistrictIds || []).map((id) => Number(id)));
    if (districtId) {
      set.add(Number(districtId));
    }
    return Array.from(set);
  }, [serviceDistrictIds, districtId]);

  function buildLocationString(nextStateId, nextDistrictId, nextCityId, districtsList, citiesList) {
    const sName = statesMap[String(nextStateId)]?.name || "";
    const dName = (districtsList || []).find((d) => String(d.id) === String(nextDistrictId))?.name || "";
    const cName = (citiesList || []).find((c) => String(c.id) === String(nextCityId))?.name || "";
    return [cName, dName, sName].filter(Boolean).join(", ");
  }

  function handleBaseStateChange(e) {
    const nextStateId = e.target.value;
    const sName = statesMap[String(nextStateId)]?.name || "";
    onBaseLocationChange({
      state: nextStateId,
      district: "",
      city: "",
      location: sName || legacyLocation,
    });
    if (nextStateId && !selectedStateIds.includes(nextStateId)) {
      setSelectedStateIds((prev) => [nextStateId, ...prev]);
    }
  }

  function handleBaseDistrictChange(e) {
    const nextDistrictId = e.target.value;
    const built = buildLocationString(stateId, nextDistrictId, "", baseDistricts, []);
    onBaseLocationChange({
      state: stateId,
      district: nextDistrictId,
      city: "",
      location: built || legacyLocation,
    });
    if (nextDistrictId) {
      const nextNum = Number(nextDistrictId);
      if (!normalizedServiceIds.includes(nextNum)) {
        onServiceDistrictsChange([...normalizedServiceIds, nextNum]);
      }
    }
  }

  function handleBaseCityChange(e) {
    const nextCityId = e.target.value;
    const built = buildLocationString(stateId, districtId, nextCityId, baseDistricts, baseCities);
    onBaseLocationChange({
      state: stateId,
      district: districtId,
      city: nextCityId,
      location: built || legacyLocation,
    });
  }

  function handleAddState() {
    if (!stateToAdd || selectedStateIds.includes(stateToAdd)) return;
    setSelectedStateIds((prev) => [...prev, stateToAdd]);
    setStateToAdd("");
  }

  function handleRemoveState(sid) {
    const stateDistricts = districtsByState[sid] || [];
    const stateDistrictIdSet = new Set(stateDistricts.map((d) => Number(d.id)));
    const baseDistNum = districtId ? Number(districtId) : null;

    const remaining = normalizedServiceIds.filter(
      (id) => !stateDistrictIdSet.has(id) || id === baseDistNum
    );
    onServiceDistrictsChange(remaining);
    setSelectedStateIds((prev) => prev.filter((id) => id !== sid));
  }

  function handleToggleDistrict(did) {
    const numId = Number(did);
    if (districtId && numId === Number(districtId)) {
      // Base district is always included in service coverage
      return;
    }
    if (normalizedServiceIds.includes(numId)) {
      onServiceDistrictsChange(normalizedServiceIds.filter((id) => id !== numId));
    } else {
      onServiceDistrictsChange([...normalizedServiceIds, numId]);
    }
  }

  function handleSelectAllInState(sid) {
    const list = districtsByState[sid] || [];
    const next = new Set(normalizedServiceIds);
    list.forEach((d) => next.add(Number(d.id)));
    onServiceDistrictsChange(Array.from(next));
  }

  function handleClearStateDistricts(sid) {
    const list = districtsByState[sid] || [];
    const stateSet = new Set(list.map((d) => Number(d.id)));
    const baseDistNum = districtId ? Number(districtId) : null;
    onServiceDistrictsChange(
      normalizedServiceIds.filter((id) => !stateSet.has(id) || id === baseDistNum)
    );
  }

  const availableStatesToAdd = states.filter(
    (s) => !selectedStateIds.includes(String(s.id))
  );

  function renderFieldError(key) {
    const errs = errors[key];
    if (!errs || !errs.length) return null;
    return (
      <small className="tl-loc-error">
        {errs.map((item) => item.message || item).join(" ")}
      </small>
    );
  }

  return (
    <div className="tl-loc-root">
      {/* Base Location */}
      <div className="tl-loc-card">
        <div className="tl-loc-card-header">
          <MapPin size={17} className="tl-loc-accent-icon" />
          <div>
            <h3>Base Location</h3>
            <p>Select your primary state/UT, district, and optional city.</p>
          </div>
        </div>

        <div className="tl-loc-base-grid">
          <label className="tl-loc-field">
            <span>State / Union Territory *</span>
            <select
              value={stateId ? String(stateId) : ""}
              onChange={handleBaseStateChange}
              disabled={statesLoading}
              required
            >
              <option value="">
                {statesLoading ? "Loading states..." : "Select State / UT"}
              </option>
              {states.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                  {s.is_union_territory ? " (UT)" : ""}
                </option>
              ))}
            </select>
            {renderFieldError("state")}
          </label>

          <label className="tl-loc-field">
            <span>Base District *</span>
            <select
              value={districtId ? String(districtId) : ""}
              onChange={handleBaseDistrictChange}
              disabled={!stateId || baseDistrictsLoading}
              required
            >
              <option value="">
                {!stateId
                  ? "Select a state first"
                  : baseDistrictsLoading
                  ? "Loading districts..."
                  : "Select District"}
              </option>
              {baseDistricts.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
            {renderFieldError("district")}
          </label>

          <label className="tl-loc-field">
            <span>City / Town (Optional)</span>
            <select
              value={cityId ? String(cityId) : ""}
              onChange={handleBaseCityChange}
              disabled={!districtId || baseCitiesLoading}
            >
              <option value="">
                {!districtId
                  ? "Select a district first"
                  : baseCitiesLoading
                  ? "Loading cities..."
                  : "Optional — Select City / Town"}
              </option>
              {baseCities.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("city")}
          </label>
        </div>

        {legacyLocation && !stateId && (
          <p className="tl-loc-legacy-hint">
            Current saved location: <strong>{legacyLocation}</strong>. Choose your State and District above to update your structured coverage.
          </p>
        )}
      </div>

      {/* Multi-State, Multi-District Travel Coverage */}
      <div className="tl-loc-card">
        <div className="tl-loc-card-header">
          <Globe2 size={17} className="tl-loc-accent-icon" />
          <div>
            <h3>Where are you available for bookings?</h3>
            <p>
              Select one or more states and the specific districts where you accept events. Your base district is automatically included.
            </p>
          </div>
        </div>

        <div className="tl-loc-add-state-row">
          <select
            value={stateToAdd}
            onChange={(e) => setStateToAdd(e.target.value)}
            disabled={statesLoading || availableStatesToAdd.length === 0}
            aria-label="Select a state to add to travel coverage"
          >
            <option value="">
              {availableStatesToAdd.length === 0
                ? "All states added"
                : "Select a state/UT to add..."}
            </option>
            {availableStatesToAdd.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="tl-loc-add-btn"
            onClick={handleAddState}
            disabled={!stateToAdd}
          >
            <Plus size={15} />
            Add another state
          </button>
        </div>

        {selectedStateIds.length === 0 ? (
          <div className="tl-loc-empty">
            Select your base state above or add a state to choose booking districts.
          </div>
        ) : (
          <div className="tl-loc-states-list">
            {selectedStateIds.map((sid) => {
              const stateInfo = statesMap[sid];
              const stateName =
                stateInfo?.name ||
                initialServiceStates.find((s) => String(s.id) === sid)?.name ||
                `State #${sid}`;
              const districts = districtsByState[sid] || [];
              const isLoading = Boolean(loadingStateIds[sid]);
              const selectedInThisState = districts.filter((d) =>
                normalizedServiceIds.includes(Number(d.id))
              );
              const isBaseState = String(stateId) === sid;

              return (
                <div key={sid} className="tl-loc-state-block">
                  <div className="tl-loc-state-top">
                    <div className="tl-loc-state-title">
                      <span>{stateName}</span>
                      {isBaseState && (
                        <span className="tl-loc-badge">Base State</span>
                      )}
                      <span className="tl-loc-count">
                        {selectedInThisState.length} selected
                      </span>
                    </div>

                    <div className="tl-loc-state-actions">
                      {districts.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="tl-loc-link-btn"
                            onClick={() => handleSelectAllInState(sid)}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="tl-loc-link-btn"
                            onClick={() => handleClearStateDistricts(sid)}
                          >
                            Clear
                          </button>
                        </>
                      )}
                      {!isBaseState && (
                        <button
                          type="button"
                          className="tl-loc-remove-state-btn"
                          onClick={() => handleRemoveState(sid)}
                          title={`Remove ${stateName}`}
                        >
                          <X size={14} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="tl-loc-loading">Loading districts...</div>
                  ) : (
                    <>
                      <div className="tl-loc-district-picker">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleToggleDistrict(e.target.value);
                            }
                          }}
                          aria-label={`Add district in ${stateName}`}
                        >
                          <option value="">
                            + Add a district in {stateName}...
                          </option>
                          {districts
                            .filter(
                              (d) => !normalizedServiceIds.includes(Number(d.id))
                            )
                            .map((d) => (
                              <option key={d.id} value={String(d.id)}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {selectedInThisState.length > 0 && (
                        <div className="tl-loc-chips">
                          {selectedInThisState.map((d) => {
                            const isBaseDistrict =
                              districtId && Number(d.id) === Number(districtId);
                            return (
                              <span
                                key={d.id}
                                className={`tl-loc-chip ${
                                  isBaseDistrict ? "is-base" : ""
                                }`}
                              >
                                <span>
                                  {d.name}
                                  {isBaseDistrict ? " (Base)" : ""}
                                </span>
                                {!isBaseDistrict && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDistrict(d.id)}
                                    aria-label={`Remove ${d.name}`}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {renderFieldError("service_districts")}
      </div>
    </div>
  );
}
