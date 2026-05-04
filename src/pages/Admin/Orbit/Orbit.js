import React, { useState } from 'react';

const CircularMenu = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);

    const menuItems = {
        'screen': {
            title: 'Digitale Medien',
            items: [
                'Webkonzeption und -design',
                'Online-Shops',
                'Soical-Media-Marketing (SMM)',
                'Display Advertising / Werbebanner',
                'E-Mail-Marketing / Newsletter',
                'Suchmaschinenmarketing (SEM)',
                'Suchmaschinenoptimierung (SEO)',
                'Content Management Systeme',
                'Intranet- und Extranet-Lösungen'
            ]
        },
        'buch': {
            title: 'Klassische Medien',
            items: []
        },
        'film': {
            title: 'Filme & Videos',
            items: []
        },
        'kompass': {
            title: 'Strategie & Beratung',
            items: []
        }
    };

    const handleMenuClick = (icon) => {
        setActiveMenu(icon);
        setMenuOpen(true);
    };

    return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-200">
            <div className="relative w-[540px] h-[540px]">
                {/* Logo */}
                <div className="absolute left-[calc(50%-50px)] top-[calc(50%-50px)] w-[100px] h-[100px] rounded-full bg-white shadow-inner flex items-center justify-center">
                    {/* <img 
            src="https://www.designeinheit.de/kunden/mm/logo_mm_kreis.svg" 
            alt="Logo" 
            className="w-[80%] h-[80%] object-contain"
          /> */}
                </div>

                <div className="absolute left-[calc(50%-120px)] top-[calc(50%-120px)] w-[240px] h-[240px]">
                    {/* <img 
            src="https://www.designeinheit.de/kunden/mm/text_kreislauf.svg" 
            alt="Circular Text" 
            className="w-full h-full animate-[rotate_30s_linear_infinite_reverse]"
          /> */}
                </div>

                <div className="absolute left-[calc(50%-160px)] top-[calc(50%-160px)] w-[320px] h-[320px] border-2 border-dashed border-[#00000033]/20 rounded-full animate-[rotate_35s_linear_infinite]">

                    <div className="absolute w-[98px] h-[98px] left-[-39px] text-xs top-[calc(50%-24px)] rounded-full border border-[#2563EB94]/50 bg-[#E5EBF8] shadow-inner flex items-center justify-center animate-[rotate_35s_linear_infinite_reverse] text-center" style={{ boxShadow: 'inset 0px -21px 32px 0px #0029824D' }}>
                        Frontend Developer
                    </div>
                    <div className="absolute  w-[98px] h-[98px] left-[calc(100%-54px)] top-[calc(50%-24px)] rounded-full text-xs text-center border border-[#2563EB94]/50 bg-[#E5EBF8] shadow-inner flex items-center justify-center animate-[rotate_35s_linear_infinite_reverse]" style={{ boxShadow: 'inset 0px -21px 32px 0px #0029824D' }}>
                        Frontend Developer
                    </div>

                    <div
                        className="absolute w-[64px] h-[64px] left-[-32px] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_35s_linear_infinite_reverse]"
                        onClick={() => handleMenuClick('buch')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Klassische Medien
                        </div>
                    </div>
                    <div
                        className="absolute w-[64px] h-[64px] left-[calc(100%-32px)] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_35s_linear_infinite_reverse]"
                        onClick={() => handleMenuClick('film')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Filme & Videos
                        </div>
                    </div>
                </div>

                {/* <div className="absolute left-[calc(50%-220px)] top-[calc(50%-220px)] w-[440px] h-[440px] border-2 border-dashed border-[#00000033]/20 rounded-full animate-[rotate_45s_linear_infinite_reverse]">
                 
                    <div className="absolute w-[48px] h-[48px] left-[-24px] top-[calc(50%-24px)] rounded-full bg-white shadow-inner flex items-center justify-center animate-[rotate_45s_linear_infinite]">
                        <img
                            src="https://www.designeinheit.de/kunden/mm/icon_kompass.svg"
                            alt="Kompass Icon"
                            className="w-[85%] h-[85%] object-contain"
                        />
                    </div>
                    <div className="absolute w-[48px] h-[48px] left-[calc(100%-24px)] top-[calc(50%-24px)] rounded-full bg-white shadow-inner flex items-center justify-center animate-[rotate_45s_linear_infinite]">
                        <img
                            src="https://www.designeinheit.de/kunden/mm/icon_screen.svg"
                            alt="Screen Icon"
                            className="w-[85%] h-[85%] object-contain"
                        />
                    </div>

                    <div
                        className="absolute w-[64px] h-[64px] left-[-32px] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_45s_linear_infinite]"
                        onClick={() => handleMenuClick('kompass')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Strategie & Beratung
                        </div>
                    </div>
                    <div
                        className="absolute w-[64px] h-[64px] left-[calc(100%-32px)] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_45s_linear_infinite]"
                        onClick={() => handleMenuClick('screen')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Digitale Medien
                        </div>
                    </div>
                </div> */}

                <div className="absolute left-[calc(50%-280px)] top-[calc(50%-270px)] w-[560px] h-[560px] border-2 border-dashed border-[#00000033]/20 rounded-full animate-[rotate_45s_linear_infinite_reverse]">
                    {/* Outer Dots */}
                    <div className="absolute w-[48px] h-[48px] left-[-24px] top-[calc(50%-24px)] rounded-full bg-white shadow-inner flex items-center justify-center animate-[rotate_45s_linear_infinite]">
                        <img
                            src="https://www.designeinheit.de/kunden/mm/icon_kompass.svg"
                            alt="Kompass Icon"
                            className="w-[85%] h-[85%] object-contain"
                        />
                    </div>
                    <div className="absolute w-[48px] h-[48px] left-[calc(100%-24px)] top-[calc(50%-24px)] rounded-full bg-white shadow-inner flex items-center justify-center animate-[rotate_45s_linear_infinite]">
                        <img
                            src="https://www.designeinheit.de/kunden/mm/icon_screen.svg"
                            alt="Screen Icon"
                            className="w-[85%] h-[85%] object-contain"
                        />
                    </div>

                    <div
                        className="absolute w-[64px] h-[64px] left-[-32px] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_45s_linear_infinite]"
                        onClick={() => handleMenuClick('kompass')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Strategie & Beratung
                        </div>
                    </div>
                    <div
                        className="absolute w-[64px] h-[64px] left-[calc(100%-32px)] top-[calc(50%-32px)] rounded-full cursor-pointer animate-[rotate_45s_linear_infinite]"
                        onClick={() => handleMenuClick('screen')}
                    >
                        <div className="absolute w-[170px] left-[calc(50%-85px)] top-[-10px] bg-orange-500 text-black rounded text-center text-sm opacity-0 group-hover:opacity-100 group-hover:top-[-25px] transition-all duration-150 pointer-events-none">
                            Digitale Medien
                        </div>
                    </div>
                </div>

                {/* Menu */}
                {menuOpen && (
                    <div
                        className="absolute inset-0 w-full h-full rounded-full bg-white bg-opacity-90 flex items-center justify-center z-10"
                        onClick={() => setMenuOpen(false)}
                    >
                        <div className="text-center mb-5 max-w-xs">
                            <div className="w-[60px] h-[60px] rounded-full bg-white shadow-inner mx-auto mb-5 flex items-center justify-center">
                                <img
                                    src={`https://www.designeinheit.de/kunden/mm/icon_${activeMenu}.svg`}
                                    alt={`${activeMenu} Icon`}
                                    className="w-[85%] h-[85%] object-contain"
                                />
                            </div>
                            <h2 className="font-serif text-lg text-orange-500 mb-2">
                                {menuItems[activeMenu]?.title}
                            </h2>
                            <ul className="font-sans text-xs text-gray-600">
                                {menuItems[activeMenu]?.items.map((item, index) => (
                                    <li key={index} className="leading-7">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CircularMenu;