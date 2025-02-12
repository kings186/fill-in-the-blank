import React, { useState, useEffect } from 'react';
import { Input, Button, Table, message } from 'antd';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('practice'); // 当前激活的 Tab
    const [text, setText] = useState(''); // 填空功能的文本框内容
    const [words, setWords] = useState([]); // 填空功能的单词列表
    const [blankIndex, setBlankIndex] = useState(null); // 填空功能的空白词索引
    const [userChoice, setUserChoice] = useState(''); // 用户选择的单词
    const [messageText, setMessageText] = useState(''); // 填空功能的提示信息
    const [sentenceToSave, setSentenceToSave] = useState(''); // 保存句子的文本框内容
    const [saveMessage, setSaveMessage] = useState(''); // 保存句子的提示信息
    const [sentences, setSentences] = useState([]); // 从后端获取的句子列表
    const [loading, setLoading] = useState(true); // 加载状态
    const [error, setError] = useState(''); // 错误信息
    const [editingKey, setEditingKey] = useState(''); // 正在编辑的行的 key
    const [originalWords, setOriginalWords] = useState([]); // 存储原始的单词数组

    const isEditing = (record) => record.Id === editingKey;

    const edit = (record) => {
        setEditingKey(record.Id);
    };

    const cancel = () => {
        setEditingKey('');
    };

    const save = async (key, newContent) => {
        try {
            const response = await fetch(`/v2/text/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: newContent }),
            });

            if (response.ok) {
                const newSentences = sentences.map((record) => {
                    if (record.Id === key) {
                        return { ...record, Content: newContent };
                    }
                    return record;
                });
                setSentences(newSentences);
                setEditingKey('');
                message.success('句子更新成功！');
            } else {
                message.error('更新句子失败，请重试。');
            }
        } catch (error) {
            message.error('发生错误，请重试。');
        }
    };

    // 从后端获取句子数据
    useEffect(() => {
        const fetchSentences = async () => {
            try {
                const response = await fetch('/v2/text');
                if (!response.ok) {
                    throw new Error('Failed to fetch sentences');
                }
                const data = await response.json();
                setSentences(data); // 假设后端返回的是一个句子数组
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchSentences();
    }, []);

    // 处理填空输入框变化
    const handleInputChange = (e) => {
        setText(e.target.value);
    };

    // 生成空白词
    const generateBlank = () => {
        const wordsArray = text.split(' ');
        if (wordsArray.length < 2) {
            setMessageText('Please enter a longer sentence.');
            return;
        }
        const randomIndex = Math.floor(Math.random() * wordsArray.length);
        setBlankIndex(randomIndex);

        // 打乱单词顺序
        const shuffledWords = [...wordsArray];
        for (let i = shuffledWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
        }
        setWords(shuffledWords);
        setOriginalWords(wordsArray); // 存储原始的单词数组

        setUserChoice('');
        setMessageText('');
    };

    // 处理用户选择
    const handleChoice = (word) => {
        setUserChoice(word);
        if (word === originalWords[blankIndex]) { // 使用原始的单词数组来判断是否正确
            setMessageText('Correct! 🎉');
        } else {
            setMessageText('Incorrect, try again! ❌');
        }
    };

    // 处理保存句子输入框变化
    const handleSaveInputChange = (e) => {
        setSentenceToSave(e.target.value);
    };

    // 发送句子到后端
    const saveSentence = async () => {
        if (!sentenceToSave.trim()) {
            setSaveMessage('Please enter a sentence to save.');
            return;
        }

        try {
            const response = await fetch('/v2/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: sentenceToSave }),
            });

            if (response.ok) {
                setSaveMessage('Sentence saved successfully! ✅');
                setSentenceToSave('');
                // 重新获取句子列表
                const fetchResponse = await fetch('/v2/text');
                const data = await fetchResponse.json();
                setSentences(data);
            } else {
                setSaveMessage('Failed to save sentence. ❌');
            }
        } catch (error) {
            setSaveMessage('An error occurred. Please try again. ❌');
        }
    };

    // 当用户点击句子时，将其内容转移到文本框
    const handleSentenceClick = (sentence) => {
        setText(sentence.Content); // 将句子转移到填空功能的文本框
        setSentenceToSave(sentence.Content); // 将句子转移到保存句子的文本框
    };

    // 修改函数名，避免与 Hook 命名混淆
    const putSentenceInPractice = (sentence) => {
        setText(sentence.Content);
        setActiveTab('practice');
    };

    const columns = [
        {
            title: '句子内容',
            dataIndex: 'Content',
            key: 'Content',
            width: '60%',
            render: (_, record) => {
                const editable = isEditing(record);
                return editable ? (
                    <Input
                        value={record.Content}
                        onChange={(e) => {
                            const newContent = e.target.value;
                            record.Content = newContent;
                        }}
                        onPressEnter={() => save(record.Id, record.Content)}
                        onBlur={() => save(record.Id, record.Content)}
                    />
                ) : (
                    <span onClick={() => handleSentenceClick(record)}>{record.Content}</span>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                const editable = isEditing(record);
                return editable ? (
                    <span>
                        <Button onClick={() => save(record.Id, record.Content)} style={{ marginRight: 8 }}>
                            保存
                        </Button>
                        <Button onClick={cancel}>取消</Button>
                    </span>
                ) : (
                    <span>
                        <Button onClick={() => edit(record)} style={{ marginRight: 8 }}>
                            编辑
                        </Button>
                        <Button
                            type="danger"
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/v2/text/${record.Id}`, {
                                        method: 'DELETE',
                                    });
                                    if (response.ok) {
                                        const newSentences = sentences.filter((item) => item.Id!== record.Id);
                                        setSentences(newSentences);
                                        message.success('句子删除成功！');
                                    } else {
                                        message.error('删除句子失败，请重试。');
                                    }
                                } catch (error) {
                                    message.error('发生错误，请重试。');
                                }
                            }}
                        >
                            删除
                        </Button>
                        <Button onClick={() => putSentenceInPractice(record)} style={{ marginLeft: 8 }}>
                            用于练习
                        </Button>
                    </span>
                );
            },
        },
    ];

    return (
        <div className="App">
            <h1>Fill in the Blank</h1>

            {/* 导航栏 */}
            <div className="tabs">
                <button
                    className={activeTab === 'practice' ? 'active' : ''}
                    onClick={() => setActiveTab('practice')}
                >
                    练习模块
                </button>
                <button
                    className={activeTab === 'storage' ? 'active' : ''}
                    onClick={() => setActiveTab('storage')}
                >
                    存储字符模块
                </button>
            </div>

            {/* 练习模块 */}
            {activeTab === 'practice' && (
                <div className="section">
                    <h2>填空练习</h2>
                    <textarea
                        placeholder="输入一个句子"
                        value={text}
                        onChange={handleInputChange}
                        className="text-input"
                    />
                    <br />
                    <button onClick={generateBlank} className="generate-button">
                        生成填空
                    </button>
                    <br />
                    {words.length > 0 && (
                        <div className="blank-container">
                            <p className="sentence">
                                {words.map((word, index) => (
                                    <span key={index} className={index === blankIndex ? 'blank-word' : ''}>
                                        {index === blankIndex ? '____' : word}{' '}
                                    </span>
                                ))}
                            </p>
                            <div className="options">
                                <h3>选择正确的单词：</h3>
                                {words.map((word, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleChoice(word)}
                                        className="option-button"
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                            {userChoice && <p className="user-choice">你选择了：{userChoice}</p>}
                            {messageText && <p className="message">{messageText}</p>}
                        </div>
                    )}
                </div>
            )}

            {/* 存储字符模块 */}
            {activeTab === 'storage' && (
                <div className="section">
                    <h2>存储的句子</h2>
                    {loading && <p>加载中...</p>}
                    {error && <p className="error">{error}</p>}

                    {/* 保存句子功能 */}
                    <div className="save-sentence">
                        <Input.TextArea
                            placeholder="输入要保存的句子"
                            value={sentenceToSave}
                            onChange={handleSaveInputChange}
                            className="text-input"
                        />
                        <br />
                        <Button onClick={saveSentence} className="generate-button">
                            保存句子
                        </Button>
                        {saveMessage && <p className="message">{saveMessage}</p>}
                    </div>

                    {/* 句子列表 */}
                    <Table
                        dataSource={sentences}
                        columns={columns}
                        rowKey="Id"
                        loading={loading}
                        pagination={false}
                    />
                </div>
            )}
        </div>
    );
}

export default App;