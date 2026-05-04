import React from 'react';

const BadgeCard = ({
    imageUrl,
    title,
    backgroundColor = '#ffffff',
    textColor = '#000000',
}) => {
    return (
        <div
            className="w-[140px] bg-white rounded shadow-lg hover:shadow-xl transition-shadow duration-300 text-center p-6"
            style={{
                backgroundColor,
                color: textColor,
            }}
        >
            <div className="w-20 h-20 mx-auto mb-2 overflow-hidden bg-white border border-white rounded-full shadow-md">
                <img
                    src={imageUrl}
                    alt={title}
                    className="object-contain w-full h-full"
                />
            </div>
            <h3 className="text-xs font-semibold capitalize break-all text-wrap" style={{ colo: textColor }}>{title}</h3>
        </div>
    );
};

export default BadgeCard;
