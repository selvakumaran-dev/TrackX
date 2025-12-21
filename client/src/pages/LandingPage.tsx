/**
 * Landing Page - Real Data, Professional Design
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, MapPin, Zap, Shield, Smartphone, ArrowRight, Clock } from 'lucide-react';
import api from '../services/api';

const features = [
    {
        icon: MapPin,
        title: 'Real-Time Tracking',
        description: 'Track buses live on an interactive map with GPS updates every 5 seconds.',
    },
    {
        icon: Zap,
        title: 'Instant Updates',
        description: 'Get instant notifications about bus arrivals and delays.',
    },
    {
        icon: Shield,
        title: 'Safe & Reliable',
        description: 'Enterprise-grade security for student safety.',
    },
    {
        icon: Smartphone,
        title: 'Works Everywhere',
        description: 'Access from any device - mobile, tablet, or desktop.',
    },
];

function LandingPage() {
    const [stats, setStats] = useState({ buses: 0, tracking: false });
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(false);

    useEffect(() => {
        // Fetch real bus count
        const fetchStats = async () => {
            try {
                // Add cache-busting timestamp to get fresh data
                const res = await api.get('/public/buses', {
                    params: { limit: 1, _t: Date.now() },
                    headers: { 'Cache-Control': 'no-cache' }
                });
                setStats({
                    buses: res.data.pagination?.total || 0,
                    tracking: true,
                });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setApiError(true);
                // Set fallback value for demo
                setStats({ buses: 2, tracking: true });
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-20 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[120px] opacity-60" />
                    <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-100 rounded-full blur-[100px] opacity-60" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-indigo-700 font-medium">Live Bus Tracking</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                            Know Where Your
                            <br />
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Bus Is, Always</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-10 leading-relaxed">
                            Real-time GPS tracking for school and college buses.
                            Never miss your bus again with live location updates.
                        </p>

                        {/* CTA */}
                        <Link
                            to="/track"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-lg font-semibold shadow-xl shadow-indigo-500/30 transition-all hover:scale-105"
                        >
                            <MapPin className="w-5 h-5" />
                            Track Your Bus Now
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </motion.div>

                    {/* Preview Image */}
                    <motion.div className="mt-16" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                        <div className="relative mx-auto max-w-2xl">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-2xl shadow-indigo-500/20">
                                <div className="bg-white rounded-2xl p-6">
                                    <div className="bg-gray-100 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
                                        {/* Map Preview */}
                                        <div className="absolute inset-0 opacity-30">
                                            <div className="w-full h-full" style={{
                                                backgroundImage: 'linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)',
                                                backgroundSize: '40px 40px'
                                            }} />
                                        </div>

                                        {/* Animated Buses - Show actual count */}
                                        {!loading && Array.from({ length: Math.max(Math.min(stats.buses, 5), 1) }).map((_, index) => {
                                            // Different animation paths for each bus
                                            const animations = [
                                                { x: [0, 100, 100, 0], y: [0, 50, 100, 50] },
                                                { x: [150, 50, 50, 150], y: [80, 30, 80, 80] },
                                                { x: [-50, 80, 120, -50], y: [40, 90, 40, 40] },
                                                { x: [100, 0, 0, 100], y: [20, 70, 120, 20] },
                                                { x: [50, 120, 50, 50], y: [60, 60, 10, 60] },
                                            ];
                                            const colors = [
                                                'bg-indigo-500',
                                                'bg-purple-500',
                                                'bg-blue-500',
                                                'bg-violet-500',
                                                'bg-cyan-500',
                                            ];
                                            return (
                                                <motion.div
                                                    key={index}
                                                    className="absolute"
                                                    animate={animations[index % animations.length]}
                                                    transition={{ duration: 8 + index * 2, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <div className={`w-10 h-10 ${colors[index % colors.length]} rounded-xl flex items-center justify-center shadow-lg`}>
                                                        <Bus className="w-5 h-5 text-white" />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                        <div className="relative z-10 text-center">
                                            <p className="text-gray-500 text-sm">Interactive Map Preview</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Real Stats */}
                            <div className="flex justify-center gap-4 mt-6">
                                <div className="bg-white shadow-lg shadow-gray-200/50 rounded-xl px-5 py-3 text-center border border-gray-100">
                                    <div className="text-lg font-bold text-indigo-600">
                                        {loading ? '...' : (apiError ? stats.buses + '*' : stats.buses)}
                                    </div>
                                    <div className="text-xs text-gray-500">Buses</div>
                                </div>
                                <div className="bg-white shadow-lg shadow-gray-200/50 rounded-xl px-5 py-3 text-center border border-gray-100">
                                    <div className="text-lg font-bold text-green-600 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Live
                                    </div>
                                    <div className="text-xs text-gray-500">Tracking</div>
                                </div>
                                <div className="bg-white shadow-lg shadow-gray-200/50 rounded-xl px-5 py-3 text-center border border-gray-100">
                                    <div className="text-lg font-bold text-indigo-600 flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        24/7
                                    </div>
                                    <div className="text-xs text-gray-500">Available</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose TrackX?</h2>
                        <p className="text-gray-600 max-w-xl mx-auto">Simple, reliable, and always available.</p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <Icon className="w-7 h-7 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-2xl mx-auto">
                    <motion.div
                        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-10 text-center shadow-xl"
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Track?</h2>
                        <p className="text-indigo-100 mb-8">Enter your bus number and see it live on the map.</p>
                        <Link
                            to="/track"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            <MapPin className="w-5 h-5" />
                            Start Tracking
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
