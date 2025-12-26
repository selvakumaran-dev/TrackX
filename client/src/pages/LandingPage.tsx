/**
 * Landing Page - Human-Centered Design
 * 
 * Design Philosophy:
 * - Fresh, calming color palette (sage green, warm cream, coral accents)
 * - Generous whitespace and breathing room
 * - Warm, approachable typography
 * - Subtle, purposeful animations
 * - Feels like a refreshing morning breeze
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, MapPin, Clock, Shield, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function LandingPage() {
    const [stats, setStats] = useState({ totalBuses: 0, onlineBuses: 0 });
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/public/stats');
                const { totalBuses, onlineBuses } = response.data.data;
                setStats({ totalBuses, onlineBuses });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);


    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {/* Custom Styles */}
            <style>{`
                .btn-primary {
                    background: linear-gradient(135deg, #2D6A4F 0%, #40916C 100%);
                    color: white;
                    padding: 14px 28px;
                    border-radius: 12px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 14px rgba(45, 106, 79, 0.25);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(45, 106, 79, 0.35);
                }
                .btn-secondary {
                    background: white;
                    color: #1B4332;
                    padding: 14px 28px;
                    border-radius: 12px;
                    font-weight: 600;
                    border: 2px solid #E9ECEF;
                    transition: all 0.3s ease;
                }
                .btn-secondary:hover {
                    border-color: #2D6A4F;
                    background: #F8F9FA;
                }
                .card-warm {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
                    border: 1px solid rgba(0, 0, 0, 0.04);
                }
                .input-warm {
                    background: #F8F9FA;
                    border: 2px solid #E9ECEF;
                    border-radius: 12px;
                    padding: 16px 20px;
                    font-size: 16px;
                    transition: all 0.2s ease;
                    color: #1B4332;
                }
                .input-warm:focus {
                    outline: none;
                    border-color: #2D6A4F;
                    background: white;
                    box-shadow: 0 0 0 4px rgba(45, 106, 79, 0.1);
                }
                .input-warm::placeholder {
                    color: #95A3A4;
                }
            `}</style>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E9ECEF]">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                                <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-2xl font-black text-[#1B4332] tracking-tighter">TrackX</span>
                        </Link>
                        <Link to="/track" className="btn-secondary text-sm py-2.5 px-5">
                            View All Buses
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-28 pb-16 px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D8F3DC] mb-6">
                                <span className="w-2 h-2 bg-[#40916C] rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-[#2D6A4F]">
                                    {stats.onlineBuses} buses live now
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1B4332] leading-tight mb-6">
                                Never miss your
                                <br />
                                <span className="text-[#40916C]">bus again</span>
                            </h1>

                            {/* Subheadline */}
                            <p className="text-lg text-[#52796F] leading-relaxed mb-8 max-w-lg">
                                Track your institute bus in real-time. Know exactly where it is
                                and when it'll arrive at your stop.
                            </p>

                            {/* Quick Stats */}
                            <div className="flex items-center gap-8 mb-8">
                                <div>
                                    <p className="text-3xl font-bold text-[#1B4332]">{stats.totalBuses}</p>
                                    <p className="text-sm text-[#74796D]">Total Buses</p>
                                </div>
                                <div className="w-px h-12 bg-[#E9ECEF]" />
                                <div>
                                    <p className="text-3xl font-bold text-[#40916C]">24/7</p>
                                    <p className="text-sm text-[#74796D]">Live Tracking</p>
                                </div>
                                <div className="w-px h-12 bg-[#E9ECEF]" />
                                <div>
                                    <p className="text-3xl font-bold text-[#1B4332]">5s</p>
                                    <p className="text-sm text-[#74796D]">Updates</p>
                                </div>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap items-center gap-4">
                                <Link to="/track" className="btn-primary inline-flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    Track Buses
                                </Link>
                            </div>
                        </motion.div>

                        {/* Right - Visual Preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="card-warm p-8 lg:p-10">
                                {/* Map Preview Illustration */}
                                <div className="relative aspect-square max-w-[320px] mx-auto">
                                    {/* Background circles */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-[#D8F3DC]/30 animate-pulse" />
                                    </div>
                                    <div className="absolute inset-4 flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-[#D8F3DC]/50" />
                                    </div>
                                    <div className="absolute inset-8 flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-[#D8F3DC]" />
                                    </div>

                                    {/* Center bus icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center shadow-xl">
                                            <Bus className="w-10 h-10 text-white" />
                                        </div>
                                    </div>

                                    {/* Floating stop markers */}
                                    <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-[#E07A5F] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        1
                                    </div>
                                    <div className="absolute bottom-12 left-6 w-8 h-8 rounded-full bg-[#457B9D] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        2
                                    </div>
                                    <div className="absolute top-1/3 left-4 w-8 h-8 rounded-full bg-[#F4A261] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        3
                                    </div>
                                </div>

                                {/* Caption */}
                                <div className="text-center mt-6">
                                    <p className="text-[#1B4332] font-semibold">Real-time GPS Tracking</p>
                                    <p className="text-sm text-[#74796D] mt-1">See exactly where your bus is</p>
                                </div>
                            </div>

                            {/* Decorative blur */}
                            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#D8F3DC] rounded-full blur-3xl opacity-50 -z-10" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 lg:px-8 bg-white">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#1B4332] mb-4">
                            Simple & Reliable
                        </h2>
                        <p className="text-[#52796F] max-w-md mx-auto">
                            Everything you need to track your bus, nothing you don't.
                        </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: MapPin,
                                title: 'Live Location',
                                description: 'See exactly where your bus is on the map',
                                color: '#40916C',
                                bg: '#D8F3DC',
                            },
                            {
                                icon: Clock,
                                title: 'Smart ETA',
                                description: 'Know when it arrives at your stop',
                                color: '#E07A5F',
                                bg: '#FFF1E6',
                            },
                            {
                                icon: Bus,
                                title: 'All Buses',
                                description: 'Track any bus from your institute',
                                color: '#8B5CF6',
                                bg: '#F3E8FF',
                            },
                        ].map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={i}
                                    className="card-warm p-6 text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div
                                        className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: feature.bg }}
                                    >
                                        <Icon className="w-7 h-7" style={{ color: feature.color }} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#1B4332] mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-[#74796D] leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#1B4332] mb-4">
                            How It Works
                        </h2>
                        <p className="text-[#52796F]">
                            Three simple steps to track your bus
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '1', title: 'Enter Code', desc: 'Get your institute code and enter it above' },
                            { step: '2', title: 'Find Bus', desc: 'See all buses from your institute on the map' },
                            { step: '3', title: 'Track Live', desc: 'Watch your bus moving in real-time' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                className="text-center"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#40916C] flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-semibold text-[#1B4332] mb-2">{item.title}</h3>
                                <p className="text-sm text-[#74796D]">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="card-warm p-10 md:p-16 text-center"
                        style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to track your bus?
                        </h2>
                        <p className="text-white/80 mb-8 max-w-md mx-auto">
                            Start tracking and never worry about missing your bus again.
                        </p>
                        <Link
                            to="/track"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#2D6A4F] rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                            <MapPin className="w-5 h-5" />
                            Start Tracking
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 lg:px-8 border-t border-[#E9ECEF]">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                                    <img src="/icon.svg" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-xl font-black text-[#1B4332] tracking-tighter">TrackX</span>
                            </div>
                            <p className="text-sm text-[#74796D] max-w-xs">
                                Providing next-generation real-time telemetry for institutional fleet management.
                            </p>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-[#E9ECEF] flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest">
                            © {new Date().getFullYear()} TrackX Telemetry Systems. All Rights Reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
