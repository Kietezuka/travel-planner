"use client";
import { CATEGORY_MAP } from "../constants/categories";

export default function ActivityCard({
        activity,
        onMouseEnter,
        onMouseLeave,
        isActive,
        onShowDetails,
        onDelete,
        onFocusOnMap,
    }){

    if(!activity) return null;

    const categoryStyle = CATEGORY_MAP[activity.category] || { bg: "#eeeeee", emoji: "📍" };

    return(
        <div
            className={`activity ${isActive ? `activity-active` : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* category tile instead of a photo: stock landmark images misrepresented the place */}
            <div
                className="activity__media activity__media--category"
                style={{ backgroundColor: categoryStyle.bg }}
                aria-hidden="true"
            >
                <span>{categoryStyle.emoji}</span>
            </div>
            <div className="activity__body">
                <div className="activity__header">
                    <h4 className="activity__title">{activity.title}</h4>

                    <div className="activity__header-2">
                        <span className="activity__time">{activity.startTime} - {activity.endTime}</span>
                            
                        {CATEGORY_MAP[activity.category] && (
                                <span 
                                    className="activity__color" 
                                    style={{
                                        backgroundColor : CATEGORY_MAP[activity.category].color
                                    }}
                                >
                                </span>
                            )
                        }
                    </div>

                </div>
                {activity.address && (
                    <div className="activity__meta">
                        <svg className="activity__meta-icon icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/>
                        </svg>
                        <span className="activity__meta-text">{activity.address}</span>
                    </div>
                )}
                <div className="activity__actions">
                    {activity.address && (
                        <button
                            type="button"
                            className="btn btn--sm btn--secondary"
                            aria-label={`Show ${activity.title} on map`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFocusOnMap();
                            }}
                        >
                            <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="M516-120 402-402 120-516v-56l720-268-268 720h-56Zm26-148 162-436-436 162 196 78 78 196Zm-78-196Z"/>
                            </svg>
                        </button>
                    )}


                    <button type="button"
                            className="btn btn--sm btn--secondary"
                            aria-label={`Show details of ${activity.title}`}
                            onClick={() => onShowDetails(activity)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                            <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                        </svg>
                    </button>

                    <button
                            type="button"
                            className="btn btn--sm btn--destruction"
                            aria-label={`Delete ${activity.title}`}
                            onClick={onDelete}
                        >
                            <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                            </svg>
                        </button>
                </div>
            </div>
        </div>
    )
}